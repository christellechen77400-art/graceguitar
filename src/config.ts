import Constants from 'expo-constants';

/**
 * Ce qui pointe vers l'extérieur : la version et l'adresse des retours.
 *
 * GCCGuitare est un outil interne : pas de support public, pas de pages légales à
 * héberger. L'adresse des retours vient de l'environnement
 * (`EXPO_PUBLIC_FEEDBACK_EMAIL`) pour ne jamais être écrite dans le dépôt ; sans
 * elle, la ligne « Envoyer un retour » n'apparaît pas.
 */
export const FEEDBACK_EMAIL: string = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL ?? '';

/**
 * La liaison avec l'app d'église (phase B). Tant qu'elle est à `false`, aucun
 * écran ne la mentionne : l'app est autonome et se teste sans elle.
 */
export const FEATURE_CHURCH_SYNC = false;

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.1.0';
