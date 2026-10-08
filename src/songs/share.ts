/**
 * Le partage d'un set : un lien, un QR code, et rien d'autre qui sorte.
 *
 * Ce qui voyage est exactement ce qu'il faut pour rejouer le set : la date, le nom
 * du culte, les titres, les tonalités, les capos et les grilles en chiffrage
 * Nashville. **Jamais les paroles** : elles ne sont conservées que sur l'appareil,
 * et un lien se colle n'importe où. C'est la seule raison pour laquelle les paroles
 * sont dans un champ à part du chant.
 *
 * Le format est compact par construction plutôt que compressé par une
 * bibliothèque : les grilles s'écrivent dans un alphabet minuscule (« 1 5 6m 4 »),
 * donc un set de six chants tient en quelques centaines de caractères, et un QR
 * code reste lisible à cette taille. Une vraie compression (gzip) demanderait une
 * dépendance de plus pour gagner des octets qu'on n'a pas à gagner.
 */
import { Section, Song, WorshipSet } from './model';

/** Le préfixe du lien. Le schéma est déclaré dans `app.json`. */
export const SHARE_PREFIX = 'gccguitare://import?d=';

const foldTitle = (title: string) => title.trim().toLowerCase();

/** Ce qu'un set partagé contient, en clair et en clés courtes. */
export interface SharedSong {
  t: string;
  k: number;
  m: 'major' | 'minor';
  c: number;
  /** Les sections : `nom:mesure mesure mesure`. */
  s?: string[];
}

export interface SharedSet {
  /** La version du format, pour pouvoir en changer un jour sans se tromper. */
  v: 1;
  d: string;
  n?: string;
  f?: string;
  songs: SharedSong[];
}

/** Les sections d'un chant reçu, redevenues `{ name, bars }`. */
export function sharedSections(song: SharedSong): Section[] | undefined {
  const sections = (song.s ?? []).flatMap((text) => {
    const section = splitSection(text);
    return section ? [section] : [];
  });
  return sections.length ? sections : undefined;
}

/** Une section en clair, redevenue `{ name, bars }`. */
function splitSection(text: string): { name: string; bars: string[] } | null {
  const at = text.indexOf(':');
  if (at < 0) return null;
  const name = text.slice(0, at).trim();
  const bars = text.slice(at + 1).trim().split(/\s+/).filter(Boolean);
  if (!name || !bars.length) return null;
  return { name, bars };
}

const joinSection = (section: { name: string; bars: string[] }) =>
  `${section.name}:${section.bars.join(' ')}`;

/**
 * Le set, prêt à voyager.
 *
 * Les chants absents de la bibliothèque sont sautés : un set partagé ne peut
 * décrire que ce qu'il connaît, et laisser un trou ferait un lien qui ne
 * s'ouvrirait pas.
 */
export function shareSet(set: WorshipSet, songs: Song[], from?: string): SharedSet {
  const byId = new Map(songs.map((s) => [s.id, s]));
  const entries = [...set.songs].sort((a, b) => a.order - b.order);
  return {
    v: 1,
    d: set.date,
    ...(set.serviceName ? { n: set.serviceName } : {}),
    ...(from?.trim() ? { f: from.trim().slice(0, 40) } : {}),
    songs: entries.flatMap((entry) => {
      const song = byId.get(entry.songId);
      if (!song) return [];
      return [
        {
          t: song.title.slice(0, 80),
          k: entry.key,
          m: song.mode,
          c: entry.capo,
          ...(song.sections?.length ? { s: song.sections.map(joinSection) } : {}),
        } satisfies SharedSong,
      ];
    }),
  };
}

// --------------------------------------------------------------- l'encodage

/**
 * L'alphabet base64url, écrit à la main.
 *
 * `btoa` n'existe pas partout sous React Native et n'accepte que du latin-1 : un
 * titre accentué le ferait échouer. On n'encode ici que de l'UTF-8, octet par
 * octet, et le résultat ne contient que `A-Z a-z 0-9 - _` — donc rien à échapper
 * dans un lien ni dans un QR code.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Les octets UTF-8 d'un texte, sans dépendre de `TextEncoder`. */
export function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

export function base64UrlEncode(text: string): string {
  const bytes = utf8Bytes(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALPHABET[a >> 2];
    out += ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b === undefined) break;
    out += ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c === undefined) break;
    out += ALPHABET[c & 63];
  }
  return out;
}

export function base64UrlDecode(text: string): string {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  // The bytes are UTF-8; a lone continuation byte would mean a truncated link.
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const byte = bytes[i];
    if (byte < 0x80) {
      out += String.fromCharCode(byte);
      i += 1;
    } else if (byte < 0xe0) {
      out += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (byte < 0xf0) {
      out += String.fromCharCode(((byte & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
      i += 3;
    } else {
      out += String.fromCodePoint(
        ((byte & 0x07) << 18) |
          ((bytes[i + 1] & 0x3f) << 12) |
          ((bytes[i + 2] & 0x3f) << 6) |
          (bytes[i + 3] & 0x3f),
      );
      i += 4;
    }
  }
  return out;
}

/** Le lien à coller, ou à mettre dans un QR code. */
export const shareLink = (set: SharedSet) => SHARE_PREFIX + base64UrlEncode(JSON.stringify(set));

/**
 * Le set relu depuis un lien, ou null si le lien n'est pas un set partagé.
 *
 * Tolérant à l'entrée — un lien peut arriver tronqué par une messagerie — strict
 * à la sortie : un set sans date ni chants n'est pas un set.
 */
export function readSharedLink(url: string): SharedSet | null {
  const at = url.indexOf('?d=');
  if (at < 0) return null;
  return readSharedPayload(url.slice(at + 3));
}

export function readSharedPayload(encoded: string): SharedSet | null {
  try {
    const parsed = JSON.parse(base64UrlDecode(encoded.trim())) as Partial<SharedSet>;
    if (parsed?.v !== 1) return null;
    if (typeof parsed.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.d)) return null;
    if (!Array.isArray(parsed.songs) || !parsed.songs.length) return null;
    const songs: SharedSong[] = parsed.songs.flatMap((song) => {
      if (!song || typeof song.t !== 'string' || !song.t.trim()) return [];
      if (typeof song.k !== 'number' || !Number.isFinite(song.k)) return [];
      const sections = Array.isArray(song.s)
        ? song.s.flatMap((text) => {
            const section = typeof text === 'string' ? splitSection(text) : null;
            return section ? [joinSection(section)] : [];
          })
        : [];
      return [
        {
          t: song.t.trim(),
          k: ((Math.round(song.k) % 12) + 12) % 12,
          m: song.m === 'minor' ? 'minor' : 'major',
          c: typeof song.c === 'number' && Number.isFinite(song.c) ? Math.max(0, Math.round(song.c)) : 0,
          ...(sections.length ? { s: sections } : {}),
        },
      ];
    });
    if (!songs.length) return null;
    return {
      v: 1,
      d: parsed.d,
      ...(typeof parsed.n === 'string' && parsed.n.trim() ? { n: parsed.n.trim().slice(0, 60) } : {}),
      ...(typeof parsed.f === 'string' && parsed.f.trim() ? { f: parsed.f.trim().slice(0, 40) } : {}),
      songs,
    };
  } catch {
    return null;
  }
}

/**
 * Un set reçu, transformé en chants et en set local.
 *
 * Chaque chant reçu devient un chant de la bibliothèque — deux personnes peuvent
 * avoir le même titre sans que ce soit le même chant, et écraser l'un par l'autre
 * serait pire que d'avoir un doublon visible. Les titres servent d'identifiant
 * local : « Reçu de … » doit rester reconnaissable dans la liste.
 */
export function adoptShared(
  shared: SharedSet,
  songs: Song[],
  source: string,
  newId: (prefix: string) => string,
): { songs: Song[]; set: WorshipSet } {
  const existing = new Map(songs.map((s) => [foldTitle(s.title), s]));
  const touched: Song[] = [];
  const updatedAt = new Date().toISOString();

  const entries = shared.songs.map((song, order) => {
    const key = foldTitle(song.t);
    const reused = existing.get(key);
    // A song with the same title already here is updated rather than duplicated:
    // two "Gloire à Dieu" with different grids is a trap, and the incoming one is
    // the one being shared right now.
    const target: Song = reused
      ? {
          ...reused,
          defaultKey: song.k,
          mode: song.m,
          sections: sharedSections(song) ?? reused.sections,
          updatedAt,
        }
      : {
          id: newId('song'),
          title: song.t,
          defaultKey: song.k,
          mode: song.m,
          sections: sharedSections(song),
          source: 'shared',
          updatedAt,
        };
    existing.set(key, target);
    touched.push(target);
    return { songId: target.id, key: song.k, capo: song.c, order };
  });

  return {
    // Every song touched, in its final state: the caller writes them all, whether
    // they are new or already known.
    songs: touched,
    set: {
      id: newId('set'),
      date: shared.d,
      serviceName: shared.n ?? shared.f,
      source,
      from: shared.f,
      songs: entries,
    },
  };
}
