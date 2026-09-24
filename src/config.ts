import Constants from 'expo-constants';

/**
 * Ce qui pointe vers l'extérieur : le support, les pages légales, la version.
 *
 * L'adresse et les pages sont à confirmer avant la mise en ligne — elles sont
 * écrites ici une fois, pour qu'il n'y ait qu'un endroit à corriger. La version
 * vient de `app.json` : deux numéros de version finissent toujours par diverger.
 */
export const SUPPORT_EMAIL = 'support@graceguitar.app';
export const PRIVACY_URL = 'https://graceguitar.app/confidentialite';
export const TERMS_URL = 'https://graceguitar.app/conditions';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.1.0';
