/**
 * Le guide d'utilisation : des sections, et les liens d'aide qui y mènent.
 * Le texte vit dans `content/guide.<langue>.json`.
 */
import guideEn from '../../content/guide.en.json';
import guideFr from '../../content/guide.fr.json';
import type { Lang } from '../i18n';

export interface GuideSection {
  id: string;
  title: string;
  body: string[];
}

export interface HelpLink {
  /** L'écran qui porte le lien : `accueil`, `manche.triades`… */
  screen: string;
  widget?: string;
  label: string;
  target: string;
}

const file = (lang: Lang) => (lang === 'en' ? guideEn : guideFr);

export const guideSections = (lang: Lang): GuideSection[] => file(lang).sections as GuideSection[];

export const guideSection = (lang: Lang, id: string): GuideSection | undefined =>
  guideSections(lang).find((section) => section.id === id);

export const helpLinks = (lang: Lang): HelpLink[] => file(lang).helpLinks as HelpLink[];

/** Le lien d'aide d'un écran : le plus précis d'abord (`manche.triades` avant `manche`). */
export function helpLinkFor(lang: Lang, screen: string): HelpLink | undefined {
  return helpLinks(lang).find((link) => link.screen === screen);
}
