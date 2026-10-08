/**
 * Les quatre onglets, et les deux choses qu'un écran a besoin de demander à la
 * coquille : remonter en haut, et cacher la barre.
 *
 * C'est un registre et non un routeur : il n'y a ni historique ni URL, et un
 * onglet ne s'empile jamais sur un autre. Un écran s'inscrit quand il est monté,
 * la barre appelle ce qu'elle trouve.
 */
import React, { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Refaire le test du niveau.
 *
 * Le test est un écran plein, pas une page de « Mon espace » : la feuille se
 * ferme, l'écran s'affiche, et à la fin on revient à l'app. La coquille est donc
 * la seule à pouvoir le rouvrir, et c'est elle qui le déclare ici.
 */
export const RetestContext = createContext<() => void>(() => {});

export function useRetest(): () => void {
  return useContext(RetestContext);
}

export type TabId = 'home' | 'neck' | 'sunday' | 'me';

/** L'ordre de la barre. L'index sert au déplacement de la pastille. */
export const TABS: TabId[] = ['home', 'neck', 'sunday', 'me'];

/**
 * Où remonter quand on touche l'onglet déjà actif.
 *
 * Une `Map` de module plutôt qu'un contexte : seul l'écran d'onglet monté s'y
 * inscrit, il n'y en a jamais deux, et la barre n'a rien à rendre quand la liste
 * change.
 */
const scrollers = new Map<TabId, () => void>();

export function registerScroller(tab: TabId, scroll: () => void): void {
  scrollers.set(tab, scroll);
}

export function unregisterScroller(tab: TabId): void {
  scrollers.delete(tab);
}

export function scrollTabToTop(tab: TabId): void {
  scrollers.get(tab)?.();
}

/**
 * Cacher la barre : pendant une séance d'exercice, ou sous une feuille.
 *
 * Deux écrans peuvent vouloir la cacher en même temps — une séance ouverte
 * depuis une feuille — donc la coquille compte les demandes au lieu d'obéir à la
 * dernière : celui qui se démonte rend sa place, pas celle des autres.
 */
export type TabBarHold = (key: symbol, hidden: boolean) => void;

export const TabBarContext = createContext<TabBarHold | null>(null);

export function useHideTabBar(hidden: boolean): void {
  const hold = useContext(TabBarContext);
  const key = useRef(Symbol('tabbar')).current;
  useEffect(() => {
    hold?.(key, hidden);
    return () => hold?.(key, false);
  }, [hold, key, hidden]);
}

/** Les six couches du manche, dans l'ordre où on les apprend. */
export const LAYERS = ['notes', 'intervals', 'chords', 'scales', 'caged', 'triads'] as const;
export type LayerId = (typeof LAYERS)[number];

/** D'où l'on vient quand on ouvre le guide : de quoi « Retour à … » ramène. */
export interface GuideOrigin {
  tab: TabId;
  /** Le nom de l'écran d'origine, dans la langue courante. */
  label: string;
  layer?: LayerId;
}

/**
 * Ce qu'un écran peut demander à la coquille : aller sur une couche du manche,
 * ou ouvrir une section du guide. Il n'y a ni routeur ni URL, donc c'est elle qui
 * garde l'état de la demande.
 */
export interface Nav {
  openLayer: (layer: LayerId) => void;
  openGuide: (section: string, origin: GuideOrigin) => void;
  goTab: (tab: TabId) => void;
}

export const NavContext = createContext<Nav>({
  openLayer: () => {},
  openGuide: () => {},
  goTab: () => {},
});

export const useNav = () => useContext(NavContext);
