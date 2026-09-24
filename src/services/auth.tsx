/**
 * Le compte : qui est connecté, et ce qu'on peut lui demander.
 *
 * Rien ici n'est obligatoire. Sans compte, l'app fonctionne et range tout sur le
 * téléphone ; avec, elle retrouve la progression et les chants ailleurs. Le
 * fournisseur ne lève donc jamais : chaque action rend un résultat, et l'écran
 * dit ce qui s'est passé.
 */
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { AuthErrorKey, authErrorKey } from './authErrors';
import { hasSupabase, supabase } from './supabase';

export type AuthResult = { ok: true } | { ok: false; error: AuthErrorKey };

export interface Account {
  id: string;
  email: string;
  firstName: string;
}

interface Ctx {
  /** Faux si Supabase n'est pas configuré : aucun écran de compte alors. */
  available: boolean;
  /** Vrai tant que la session enregistrée n'a pas été relue. */
  loading: boolean;
  account: Account | null;
  /** Un lien de réinitialisation a été ouvert : on demande un nouveau mot de passe. */
  recovery: boolean;
  /** Apple n'existe que sur iOS, et seulement si le module est là. */
  appleAvailable: boolean;
  signUp: (email: string, password: string, firstName: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithApple: () => Promise<AuthResult>;
  sendReset: (email: string) => Promise<AuthResult>;
  setNewPassword: (password: string) => Promise<AuthResult>;
  /** Change l'adresse : elle ne bouge qu'une fois le lien de confirmation suivi. */
  changeEmail: (email: string) => Promise<AuthResult>;
  /** Vérifie l'ancien mot de passe avant de le remplacer. */
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  updateFirstName: (firstName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
}

const AuthContext = createContext<Ctx | null>(null);

/** Le lien qui rouvre l'app pour changer de mot de passe. */
export const RESET_LINK = 'graceguitar://reset-password';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(hasSupabase);
  const [account, setAccount] = useState<Account | null>(null);
  const [firstName, setFirstName] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Le profil vient de la table `profiles` ; le prénom y est la seule chose que
  // l'app y écrive pour l'instant, avec le niveau et les préférences.
  const readProfile = async (id: string): Promise<string> => {
    if (!supabase) return '';
    const { data } = await supabase.from('profiles').select('first_name').eq('id', id).maybeSingle();
    return (data?.first_name as string | undefined) ?? '';
  };

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const user = data.session?.user;
        if (!user || cancelled) return;
        const name = await readProfile(user.id);
        if (cancelled) return;
        setFirstName(name);
        setAccount({ id: user.id, email: user.email ?? '', firstName: name });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setAccount(null);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // Le module n'existe pas sur le web : on ne le charge que là où il sert.
    import('expo-apple-authentication')
      .then((apple) => apple.isAvailableAsync())
      .then(setAppleAvailable)
      .catch(() => {});
  }, []);

  /**
   * Le lien de réinitialisation, lu à la main.
   *
   * Supabase renvoie soit un code à échanger, soit les jetons dans le fragment ;
   * les deux formes sont acceptées, parce que la seconde dépend du fournisseur
   * d'e-mail et qu'on ne choisit pas laquelle arrive.
   */
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const handle = async (url: string) => {
      if (!url.startsWith('graceguitar://')) return;
      try {
        const code = Linking.parse(url).queryParams?.code;
        if (typeof code === 'string') {
          await client.auth.exchangeCodeForSession(code);
          setRecovery(true);
          return;
        }
        const fragment = url.split('#')[1] ?? '';
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await client.auth.setSession({ access_token, refresh_token });
          setRecovery(true);
        }
      } catch {
        // Un lien qu'on ne sait pas lire ne casse rien : on reste connecté comme on
        // l'était, et l'écran de connexion propose de renvoyer un lien.
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url) void handle(url);
      })
      .catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => sub.remove();
  }, []);

  const value = useMemo<Ctx>(() => {
    /** On garde la session en mémoire dès qu'elle arrive, sans relire la table. */
    const adopt = async (id: string, email: string) => {
      const name = await readProfile(id);
      setFirstName(name);
      setAccount({ id, email, firstName: name });
    };

    return {
      available: hasSupabase && supabase !== null,
      loading,
      account: account ? { ...account, firstName } : null,
      recovery,
      appleAvailable,

      signUp: async (email, password, name) => {
        if (!supabase) return { ok: false, error: 'unknown' };
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // Le prénom part avec l'inscription : c'est le profil qui le garde, et
          // la confirmation par e-mail ne doit pas le perdre.
          options: { data: { first_name: name.trim() } },
        });
        if (error) return { ok: false, error: authErrorKey(error) };
        setFirstName(name.trim());
        if (data.user) {
          setAccount({ id: data.user.id, email: email.trim(), firstName: name.trim() });
          // La ligne de profil est écrite tout de suite : la session existe même
          // quand la confirmation par e-mail est encore en attente.
          await supabase
            .from('profiles')
            .upsert({ id: data.user.id, first_name: name.trim() }, { onConflict: 'id' })
            .then(undefined, () => {});
        }
        return { ok: true };
      },

      signIn: async (email, password) => {
        if (!supabase) return { ok: false, error: 'unknown' };
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) return { ok: false, error: authErrorKey(error) };
        if (data.user) await adopt(data.user.id, data.user.email ?? email.trim());
        return { ok: true };
      },

      signInWithApple: async () => {
        if (!supabase) return { ok: false, error: 'unknown' };
        try {
          const AppleAuthentication = await import('expo-apple-authentication');
          // Le nonce : Apple reçoit l'empreinte, Supabase reçoit l'original, et
          // les deux doivent se répondre.
          const raw = Crypto.randomUUID();
          const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashed,
          });
          if (!credential.identityToken) return { ok: false, error: 'unknown' };
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: raw,
          });
          if (error) return { ok: false, error: authErrorKey(error) };
          // Apple ne donne le prénom qu'à la première autorisation : s'il est là,
          // il vaut mieux que ce que la table contient.
          const given = credential.fullName?.givenName;
          if (given && data.user) {
            setFirstName(given);
            await supabase
              .from('profiles')
              .upsert({ id: data.user.id, first_name: given }, { onConflict: 'id' })
              .then(undefined, () => {});
          }
          if (data.user) await adopt(data.user.id, data.user.email ?? '');
          return { ok: true };
        } catch (error) {
          const key = authErrorKey(error);
          // Fermer la fenêtre Apple n'est pas une erreur à annoncer.
          return { ok: false, error: key === 'unknown' ? 'unknown' : key };
        }
      },

      sendReset: async (email) => {
        if (!supabase) return { ok: false, error: 'unknown' };
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: RESET_LINK,
        });
        return error ? { ok: false, error: authErrorKey(error) } : { ok: true };
      },

      setNewPassword: async (password) => {
        if (!supabase) return { ok: false, error: 'unknown' };
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { ok: false, error: authErrorKey(error) };
        setRecovery(false);
        return { ok: true };
      },

      changeEmail: async (email) => {
        if (!supabase) return { ok: false, error: 'unknown' };
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        return error ? { ok: false, error: authErrorKey(error) } : { ok: true };
      },

      /**
       * Changer de mot de passe, l'ancien à l'appui.
       *
       * Supabase ne l'exige pas — la session suffit — mais quelqu'un qui laisse
       * son téléphone déverrouillé ne doit pas pouvoir changer le mot de passe du
       * compte. On redemande donc l'ancien, et on le vérifie pour de vrai.
       */
      changePassword: async (current, next) => {
        if (!supabase || !account) return { ok: false, error: 'unknown' };
        const { error: wrong } = await supabase.auth.signInWithPassword({
          email: account.email,
          password: current,
        });
        if (wrong) return { ok: false, error: authErrorKey(wrong) };
        const { error } = await supabase.auth.updateUser({ password: next });
        return error ? { ok: false, error: authErrorKey(error) } : { ok: true };
      },

      updateFirstName: async (name) => {        setFirstName(name);
        if (!supabase || !account) return;
        await supabase
          .from('profiles')
          .upsert({ id: account.id, first_name: name }, { onConflict: 'id' })
          .then(undefined, () => {});
      },

      signOut: async () => {
        setAccount(null);
        if (!supabase) return;
        await supabase.auth.signOut().catch(() => {});
      },

      deleteAccount: async () => {
        if (!supabase) return { ok: false, error: 'unknown' };
        // La clé de service ne quitte pas le serveur : c'est la fonction qui
        // supprime, et elle vérifie le jeton avant.
        const { error } = await supabase.functions.invoke('delete-account', { body: {} });
        if (error) return { ok: false, error: authErrorKey(error) };
        await supabase.auth.signOut().catch(() => {});
        setAccount(null);
        return { ok: true };
      },
    };
  }, [account, firstName, loading, recovery, appleAvailable]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
