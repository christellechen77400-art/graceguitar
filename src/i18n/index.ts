import { en } from './en';
import { fr, Dict } from './fr';

export type Lang = 'fr' | 'en';
export const dictionaries: Record<Lang, Dict> = { fr, en };
export type { Dict };
