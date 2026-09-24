/**
 * D'une grille ChordPro collée à un chant enregistré.
 *
 * Le lecteur (`chordpro.ts`) rend la structure du texte ; ici on décide ce qu'on
 * en garde : les sections deviennent des mesures en chiffrage Nashville, les
 * paroles restent à part, et la tonalité est celle du fichier ou, à défaut, celle
 * que les accords suggèrent. Rien n'est deviné quand le fichier parle : un `{key}`
 * écrit à la main gagne toujours.
 */
import { parseNoteName } from '../theory/chords';
import { Mode } from '../theory/nashville';
import { inferKey, inferMode, lyrics, parseChordPro, sectionBars } from './chordpro';
import { newId, Section, Song, SongSource } from './model';

/** Ce qu'une grille donne, une fois lue : la matière d'un chant. */
interface SongDraft {
  title: string | null;
  key: number;
  mode: Mode;
  sections: Section[];
  tempo: number | null;
  lyrics: string | null;
  unknown: string[];
}

/**
 * Lit la grille et ne décide de rien : chaque appelant prend ce qui l'intéresse.
 *
 * Les paroles ne sont pas conservées par les aperçus — elles ne servent qu'au
 * chant enregistré, et jamais hors de l'appareil.
 */
function readChart(text: string): SongDraft {
  const parsed = parseChordPro(text);
  const declared = parsed.key ? parseNoteName(parsed.key) : null;
  const key = declared ?? inferKey(parsed) ?? 0;
  const mode = inferMode(parsed, key);

  const sections = parsed.sections
    .map((section) => ({
      name: section.label ?? 'verse',
      bars: sectionBars(section, key, mode),
    }))
    // A section whose chords were all unreadable has nothing to show: keeping it
    // would put an empty row on the sheet.
    .filter((section) => section.bars.length > 0);

  return {
    title: parsed.title?.trim() || null,
    key,
    mode,
    sections,
    tempo: parsed.tempo,
    lyrics: lyrics(parsed) || null,
    unknown: parsed.unknown,
  };
}

/**
 * Un chant lu depuis une grille.
 *
 * `fallbackTitle` sert quand le fichier ne se nomme pas : c'est le titre que la
 * personne a tapé dans le champ avant de coller, et il vaut mieux que « Sans titre ».
 */
export function songFromChordPro(
  text: string,
  fallbackTitle: string,
  source: SongSource = 'chordpro',
): Song {
  const draft = readChart(text);
  return {
    id: newId('song'),
    title: draft.title ?? fallbackTitle,
    defaultKey: draft.key,
    mode: draft.mode,
    // No bars at all means the chart held only words: the song keeps its key and
    // shows as "key only" rather than pretending to have a grid.
    sections: draft.sections.length ? draft.sections : undefined,
    tempo: draft.tempo ?? undefined,
    source,
    updatedAt: new Date().toISOString(),
    lyrics: draft.lyrics ?? undefined,
  };
}

/**
 * L'aperçu d'une grille collée, avant enregistrement.
 *
 * On montre ce qu'on a reconnu plutôt que de demander confirmation à l'aveugle :
 * le titre, la tonalité, les sections, et les accords qu'on n'a pas su lire.
 * `key` reste `null` quand la grille ne dit rien et que les accords ne suffisent
 * pas à trancher — l'écran demande alors la tonalité au lieu d'en inventer une.
 */
export interface ChordProPreview {
  title: string | null;
  key: number | null;
  mode: Mode;
  sections: Section[];
  unknown: string[];
  /** Faux quand la grille ne contient aucun accord lisible. */
  usable: boolean;
}

export function previewChordPro(text: string): ChordProPreview {
  const parsed = parseChordPro(text);
  const draft = readChart(text);
  // A key is only reported when something in the chart actually says one, by
  // naming it or by using readable chords. Otherwise the reader is asked for it.
  const known = Boolean(parsed.key) || parsed.chords.length > 0;
  return {
    title: draft.title,
    key: known ? draft.key : null,
    mode: draft.mode,
    sections: draft.sections,
    unknown: draft.unknown,
    usable: draft.sections.length > 0,
  };
}

/** Le titre d'une grille, pour préremplir le champ avant même l'aperçu. */
export function titleFromChordPro(text: string): string | null {
  return parseChordPro(text).title?.trim() || null;
}
