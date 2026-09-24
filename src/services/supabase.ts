/**
 * Le client Supabase, ou rien du tout.
 *
 * Sans `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`, l'app est
 * exactement ce qu'elle était : un carnet sur le téléphone. Aucun écran de compte
 * ne s'affiche, et rien ici ne lève une erreur — un projet Supabase qu'on n'a pas
 * encore créé n'est pas une panne.
 *
 * La session est gardée dans le trousseau (SecureStore) sur un téléphone, et dans
 * le stockage local sur le web, où il n'y a pas de trousseau. SecureStore refuse
 * les valeurs au-delà de 2 048 octets : la session y est découpée, morceau par
 * morceau, par `chunk.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
// Le client se sert de `URL` et de `fetch` : React Native n'en fournit qu'une
// moitié, et cette ligne complète le reste.
import 'react-native-url-polyfill/auto';
import { chunkCountKey, chunkKey, chunkValue, joinChunks } from './chunk';

export const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Vrai quand le projet est configuré : c'est ce qui décide d'afficher le compte. */
export const hasSupabase: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = Number(await SecureStore.getItemAsync(chunkCountKey(key)));
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );
    return joinChunks(parts);
  },
  async setItem(key: string, value: string): Promise<void> {
    const parts = chunkValue(value);
    for (let index = 0; index < parts.length; index++) {
      await SecureStore.setItemAsync(chunkKey(key, index), parts[index]);
    }
    // Le compte s'écrit en dernier : une écriture interrompue laisse une session
    // incomplète, donc une reconnexion, et jamais des morceaux orphelins.
    await SecureStore.setItemAsync(chunkCountKey(key), String(parts.length));
  },
  async removeItem(key: string): Promise<void> {
    const count = Number(await SecureStore.getItemAsync(chunkCountKey(key))) || 0;
    for (let index = 0; index < count; index++) {
      await SecureStore.deleteItemAsync(chunkKey(key, index));
    }
    await SecureStore.deleteItemAsync(chunkCountKey(key));
  },
};

/**
 * Le client, ou `null`.
 *
 * `autoRefresh` renouvelle le jeton tout seul ; `detectSessionInUrl` reste faux,
 * parce que l'app n'a pas d'URL de navigateur — c'est le lien de réinitialisation,
 * lu à la main, qui rouvre la session.
 */
export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: Platform.OS === 'web' ? AsyncStorage : secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
