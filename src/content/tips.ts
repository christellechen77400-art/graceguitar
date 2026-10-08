/**
 * Les tips (l'ampoule) : des astuces de mémoire pour retrouver une note ou une
 * forme. Le texte vit dans `content/tips.<langue>.json`, jamais dans un écran.
 *
 * Chaque tip a été vérifié par le calcul (`docs/verification/theory_tips.py`) ou
 * par la théorie ; `scripts/theory-check.ts` en rejoue une partie à chaque fois.
 */
import tipsEn from '../../content/tips.en.json';
import tipsFr from '../../content/tips.fr.json';
import type { Lang } from '../i18n';
import type { LayerId } from '../navigation';

export interface Tip {
  id: string;
  order: number;
  group: string;
  title: string;
  text: string;
  example: string;
  memo: string;
  /** Les écrans où le tip s'affiche, par leur nom dans le JSON. */
  showOn: string[];
}

/** Le nom d'une couche dans `showOn`. */
const SHOW_KEY: Record<LayerId, string> = {
  notes: 'notes',
  intervals: 'intervalles',
  chords: 'accords',
  scales: 'gammes',
  caged: 'caged',
  triads: 'triades',
};

export function allTips(lang: Lang): Tip[] {
  const file = lang === 'en' ? tipsEn : tipsFr;
  return [...(file.tips as Tip[])].sort((a, b) => a.order - b.order);
}

/** Les tips d'une couche, dans l'ordre. */
export const tipsForLayer = (lang: Lang, layer: LayerId): Tip[] =>
  allTips(lang).filter((tip) => tip.showOn.includes(SHOW_KEY[layer]));

/**
 * Le tip d'une couche, qui change d'un jour à l'autre quand il y en a plusieurs :
 * même tip toute la journée, pour qu'on puisse le retrouver en rouvrant l'écran.
 */
export function tipForLayer(lang: Lang, layer: LayerId, iso: string): Tip | null {
  const list = tipsForLayer(lang, layer);
  return list.length ? list[dayNumber(iso) % list.length] : null;
}

/** Le tip du jour de l'Accueil, tous écrans confondus. */
export function tipOfDay(lang: Lang, iso: string): Tip {
  const list = allTips(lang);
  return list[dayNumber(iso) % list.length];
}

/** Les tips par groupe, dans l'ordre d'apparition des groupes. */
export function tipsByGroup(lang: Lang): { group: string; tips: Tip[] }[] {
  const groups: { group: string; tips: Tip[] }[] = [];
  for (const tip of allTips(lang)) {
    let entry = groups.find((g) => g.group === tip.group);
    if (!entry) {
      entry = { group: tip.group, tips: [] };
      groups.push(entry);
    }
    entry.tips.push(tip);
  }
  return groups;
}

/** Un numéro de jour stable à partir de « AAAA-MM-JJ ». */
function dayNumber(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 86_400_000);
}
