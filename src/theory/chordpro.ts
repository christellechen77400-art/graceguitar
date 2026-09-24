/**
 * ChordPro reader. Pure text in, song structure out — no React, no storage.
 *
 * We read the format rather than render it: the app needs the progression and
 * its key to show shapes, suggest a capo and transpose, not a chord sheet with
 * the chords printed above the words. Lyrics are kept because a worship leader
 * recognises a song by its first line.
 */
import { ChordId, parseChordSymbol } from './chords';
import { mod12 } from './notes';

export interface ChordToken {
  /** As written, so an unreadable chord can be shown back to the reader. */
  text: string;
  /** Character offset into the lyric line, for aligning the two. */
  at: number;
  /** Null when the symbol could not be read. */
  parsed: { root: number; chord: ChordId; bass: number | null } | null;
}

export interface SongLine {
  lyrics: string;
  chords: ChordToken[];
}

export interface SongSection {
  /** `{start_of_chorus}` and friends, or the plain label written before a colon. */
  label: string | null;
  lines: SongLine[];
}

export interface ParsedSong {
  title: string | null;
  artist: string | null;
  /** Declared key, as written. */
  key: string | null;
  capo: number | null;
  tempo: number | null;
  sections: SongSection[];
  /** Distinct readable chords, in order of first appearance. */
  chords: { root: number; chord: ChordId; bass: number | null }[];
  /** Symbols we could not read, so they can be reported rather than dropped. */
  unknown: string[];
}

const DIRECTIVE = /^\{\s*([a-zA-Z_]+)\s*(?::\s*([^}]*))?\}$/;
const CHORD = /\[([^\]]*)\]/g;

/** Section names used by ChordPro, mapped to the label shown in the app. */
const SECTION_DIRECTIVES: Record<string, string> = {
  start_of_chorus: 'chorus',
  start_of_verse: 'verse',
  start_of_bridge: 'bridge',
  start_of_tab: 'tab',
  start_of_grid: 'grid',
};
const SECTION_END = /^end_of_/;

const NOISE_DIRECTIVES = new Set(['comment', 'comment_italic', 'comment_box', 'new_page', 'column_break']);

/**
 * Reads one line of a ChordPro file.
 *
 * Bracketed chords are pulled out of the lyric and their offsets recorded, so the
 * caller can put them back above the right syllable without the parse losing
 * where they were.
 */
export function parseLine(text: string): SongLine {
  const chords: ChordToken[] = [];
  let lyrics = '';
  let cursor = 0;

  CHORD.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CHORD.exec(text))) {
    lyrics += text.slice(cursor, match.index);
    const symbol = match[1].trim();
    if (symbol) chords.push({ text: symbol, at: lyrics.length, parsed: parseChordSymbol(symbol) });
    cursor = match.index + match[0].length;
  }
  lyrics += text.slice(cursor);
  return { lyrics: lyrics.trim(), chords };
}

/**
 * Parses a whole ChordPro song.
 *
 * Tolerant by design: hand-typed files have stray directives, blank lines and
 * chords nobody can read. Anything unrecognised is collected rather than thrown,
 * because losing the whole song over one bad bracket would be worse than showing
 * it with one chord missing.
 */
export function parseChordPro(text: string): ParsedSong {
  const song: ParsedSong = {
    title: null,
    artist: null,
    key: null,
    capo: null,
    tempo: null,
    sections: [],
    chords: [],
    unknown: [],
  };
  const seen = new Set<string>();
  let current: SongSection | null = null;

  const openSection = (label: string | null) => {
    // A second `{start_of_...}` without an end closes the previous one, which is
    // what hand-written files do.
    current = { label, lines: [] };
    song.sections.push(current);
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();

    if (!line) {
      // A blank line ends a section only if the next thing is a new one; keeping
      // it out of the lyrics is enough for our purposes.
      continue;
    }

    const directive = DIRECTIVE.exec(line);
    if (directive) {
      const name = directive[1].toLowerCase();
      const value = (directive[2] ?? '').trim();
      if (SECTION_END.test(name)) {
        current = null;
      } else if (SECTION_DIRECTIVES[name]) {
        openSection(value || SECTION_DIRECTIVES[name]);
      } else if (name === 'title' || name === 't' || name === 'title_fr') {
        song.title = value || null;
      } else if (name === 'artist' || name === 'subtitle' || name === 'st') {
        song.artist = value || null;
      } else if (name === 'key') {
        song.key = value || null;
      } else if (name === 'capo') {
        const n = parseInt(value.replace(/[^0-9]/g, ''), 10);
        song.capo = Number.isFinite(n) ? n : null;
      } else if (name === 'tempo') {
        const n = parseInt(value, 10);
        song.tempo = Number.isFinite(n) ? n : null;
      } else if (!NOISE_DIRECTIVES.has(name)) {
        // Unknown but harmless: ignore rather than fail the whole file.
      }
      continue;
    }

    // A plain comment, and a recognised section header typed as "Chorus:".
    if (line.startsWith('#')) {
      const asLabel = line.replace(/^#+\s*/, '').replace(/:\s*$/, '').toLowerCase();
      if (SECTION_DIRECTIVES[`start_of_${asLabel}`]) openSection(asLabel);
      continue;
    }

    const parsed = parseLine(line);
    if (!parsed.lyrics && !parsed.chords.length) continue;
    if (!current) openSection(null);
    current!.lines.push(parsed);

    for (const c of parsed.chords) {
      if (!c.parsed) {
        if (!song.unknown.includes(c.text)) song.unknown.push(c.text);
        continue;
      }
      const id = `${c.parsed.root}:${c.parsed.chord}:${c.parsed.bass ?? ''}`;
      if (seen.has(id)) continue;
      seen.add(id);
      song.chords.push(c.parsed);
    }
  }

  return song;
}

/**
 * The progression, as one chord per change, chords held for as long as they last.
 *
 * The last chord of a line carries on into the next one rather than being cut off,
 * so `G           G` on two lines reads as one chord, not two.
 */
export function progression(song: ParsedSong): { root: number; chord: ChordId }[] {
  const out: { root: number; chord: ChordId }[] = [];
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const token of line.chords) {
        if (!token.parsed) continue;
        const last = out[out.length - 1];
        if (last && last.root === token.parsed.root && last.chord === token.parsed.chord) continue;
        out.push({ root: token.parsed.root, chord: token.parsed.chord });
      }
    }
  }
  return out;
}

/**
 * The key the song is most likely in, when the file does not declare one.
 *
 * Chords are scored by how well they sit in a major key — the tonic and dominant
 * count for much more than a chord that only appears in a mode — and the winner is
 * the key whose scale contains them all.
 */
export function inferKey(song: ParsedSong): number | null {
  const used = progression(song);
  if (!used.length) return null;

  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const WEIGHT: Record<number, number> = { 0: 3, 7: 2, 5: 2, 9: 2, 4: 1, 2: 1, 11: 1 };

  const tally = new Map<number, number>();
  used.forEach((c, i) => {
    // The first and last chords of a worship song are almost always the tonic,
    // so they weigh more than one buried in the middle.
    const edge = i === 0 || i === used.length - 1 ? 2 : 1;
    const prev = tally.get(c.root) ?? 0;
    tally.set(c.root, prev + edge);
  });

  let best: { key: number; score: number } | null = null;
  for (let key = 0; key < 12; key++) {
    let score = 0;
    let fits = 0;
    for (const [root, weight] of tally) {
      const degree = mod12(root - key);
      if (!MAJOR.includes(degree)) continue;
      fits++;
      score += weight * (WEIGHT[degree] ?? 1);
    }
    // A key that cannot hold every chord is not the key, however well it scores.
    if (fits < tally.size) score -= 4 * (tally.size - fits);
    if (!best || score > best.score) best = { key, score };
  }
  return best ? best.key : null;
}
