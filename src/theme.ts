/**
 * La charte, et rien d'autre : aucune couleur ni aucune taille de texte ne doit
 * être écrite ailleurs dans l'app.
 *
 * Deux palettes, ivoire et nuit. Le choix se fait par `useTheme`, qui tient
 * compte du réglage Apparence et, en mode Automatique, de celui du système.
 */
import { useMemo } from 'react';
import { useColorScheme, TextStyle } from 'react-native';
import { useSettings } from './state/settings';

export type Appearance = 'auto' | 'light' | 'dark';

export interface Palette {
  /** Le fond de l'écran. */
  background: string;
  /** Le fond d'une carte posée sur le fond. */
  card: string;
  /** Le texte principal. */
  label: string;
  /** Le texte secondaire : sous-titres, notes, légendes. */
  secondary: string;
  /** Les filets. */
  separator: string;
  /** Les pastilles et les boutons secondaires. */
  fill: string;
  /** L'accent, unique : action principale, sélection, liens, progression. */
  accent: string;
  /** Le texte posé sur l'accent. */
  onAccent: string;
  iconBackground: string;
  iconForeground: string;
  destructive: string;
}

/**
 * L'ivoire et le marron. Le texte principal sur le fond est à 13:1, le
 * secondaire à 5:1, l'accent à 4,6:1 — tous au-dessus des 4,5:1 demandés.
 */
export const LIGHT: Palette = {
  background: '#F5EFE3',
  card: '#FFFCF6',
  label: '#221C14',
  secondary: '#75695A',
  separator: '#E6DCCB',
  fill: '#EFE6D6',
  accent: '#A85608',
  onAccent: '#FFFFFF',
  iconBackground: '#F1E8D8',
  iconForeground: '#5A4A33',
  destructive: '#B3261E',
};

export const DARK: Palette = {
  background: '#12100D',
  card: '#1E1A16',
  label: '#F3ECE0',
  secondary: '#A89F92',
  separator: '#3A332B',
  fill: '#2B2620',
  accent: '#F2A33A',
  onAccent: '#1E1A16',
  iconBackground: '#2B2620',
  iconForeground: '#D8CFC2',
  destructive: '#FF8A80',
};

/**
 * Le manche a les mêmes couleurs dans les deux modes : c'est un morceau de bois
 * et de métal, pas une surface de l'interface. L'éclaircir la nuit en ferait
 * autre chose.
 */
export const NECK = {
  rosewood: '#2E2119',
  fretWire: '#BFB6A8',
  nut: '#F3EEE4',
  string: '#E6DED0',
  inlay: '#5A4636',
  /** La fondamentale. */
  root: '#F2A33A',
  /** Toutes les autres notes. */
  note: '#FFFFFF',
  /** Le texte posé sur un marqueur. */
  onMarker: '#221C14',
  /** Une note non jouée : un contour, jamais un aplat. */
  ghostStroke: 'rgba(255,255,255,0.45)',
} as const;

/** Les noms chargés par `useFonts` dans App.tsx. */
export const newsreader = {
  regular: 'Newsreader_400Regular',
  medium: 'Newsreader_500Medium',
  italic: 'Newsreader_400Regular_Italic',
} as const;

/**
 * L'échelle typographique. Les titres sont en Newsreader, tout le reste en
 * police du système.
 *
 * Le nom de la police porte déjà sa graisse : on ne pose pas de `fontWeight`
 * sur une famille Newsreader, sinon Android choisit une graisse de synthèse.
 */
export const type = {
  /** La salutation de l'accueil, le titre d'un onglet. */
  greeting: { fontFamily: newsreader.medium, fontSize: 38, lineHeight: 44 },
  /** Le titre au-dessus d'une carte. */
  section: { fontFamily: newsreader.medium, fontSize: 23 },
  /** Le titre d'une carte importante. */
  cardTitle: { fontFamily: newsreader.medium, fontSize: 22 },
  /** Le nom d'un accord dans une carte. */
  chordName: { fontFamily: newsreader.medium, fontSize: 34 },
  /** Le nom de la notion du jour. */
  notion: { fontFamily: newsreader.italic, fontSize: 34 },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17 },
  subhead: { fontSize: 15 },
  caption: { fontSize: 13 },
  tab: { fontSize: 11, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

/**
 * Les chiffres d'un score, d'un temps ou d'un compteur doivent s'aligner
 * verticalement d'une ligne à l'autre, sinon ils dansent à chaque mise à jour.
 */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

/** 16 des bords, 26 entre deux sections, 16 à l'intérieur d'une carte. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 26 } as const;

export const radius = { card: 18, chip: 10, pill: 18, button: 14, icon: 8 } as const;

export const size = {
  button: 50,
  buttonSmall: 44,
  row: 44,
  rowTwoLine: 56,
  /** Rien de tactile en dessous. */
  touch: 44,
  icon: 30,
} as const;

/** La barre flottante est posée par-dessus le contenu : chaque écran lui réserve ça. */
export const SCREEN_BOTTOM = 130;

export const TAB_BAR = {
  side: 16,
  bottom: 28,
  height: 64,
  radius: 32,
  padding: 6,
  pillHeight: 52,
} as const;

export interface Theme {
  c: Palette;
  dark: boolean;
  neck: typeof NECK;
  type: typeof type;
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
}

export function useTheme(): Theme {
  const { settings } = useSettings();
  const system = useColorScheme();
  const dark = settings.appearance === 'dark' || (settings.appearance === 'auto' && system === 'dark');

  return useMemo(
    () => ({ c: dark ? DARK : LIGHT, dark, neck: NECK, type, space, radius, size }),
    [dark],
  );
}

/**
 * Les styles d'un écran, recalculés quand la palette change.
 *
 * `factory` est volontairement hors des dépendances : elle est écrite en ligne
 * dans le composant et change d'identité à chaque rendu, ce qui rejouerait le
 * `useMemo` pour rien. Ce sont la palette et le mode qui doivent le déclencher.
 */
export function useStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(theme), [theme]);
}
