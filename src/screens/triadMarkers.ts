import type { Marker } from '../components/Fretboard';
import { DisplayMode } from '../state/settings';
import { INTERVAL_LABELS, mod12, Notation, noteName, pcAt } from '../theory/notes';
import { STRING_SETS, StringSetId, TriadChord } from '../theory/triads';

/** Les trois pastilles d'une triade sur le manche, étiquetées selon l'affichage choisi. */
export function triadMarkers(
  chord: TriadChord,
  set: StringSetId,
  frets: readonly number[],
  display: DisplayMode,
  notation: Notation,
  flats: boolean,
): Marker[] {
  return STRING_SETS[set].map((string, i): Marker => {
    const fret = frets[i];
    const pc = pcAt(string, fret);
    const label =
      display === 'intervals'
        ? INTERVAL_LABELS[mod12(pc - chord.root)]
        : display === 'notes'
          ? noteName(pc, notation, flats)
          : undefined;
    return { string, fret, kind: pc === mod12(chord.root) ? 'root' : 'chord', label };
  });
}
