/**
 * Le schéma d'un tip sur le manche : les cases qu'il montre.
 *
 * Les cases sont des couples (corde, case) ; leurs notes se calculent, elles ne
 * sont pas écrites ici. `scripts/theory-check.ts` vérifie que les paires d'un tip
 * sonnent bien la même note (octave, corde voisine) ou le bon intervalle.
 */
import type { Marker } from '../components/Fretboard';
import { Notation, noteName, pcAt } from '../theory/notes';
import { triadVoicings } from '../theory/triads';

type Cell = [string: number, fret: number];

/** Des paires de cases qui disent la même chose ; la première est la fondamentale. */
const PAIRS: Record<string, Cell[][]> = {
  // Octave : 2 cordes plus haut, 2 cases plus loin (3 en arrivant sur si ou mi aigu).
  'tip-01': [
    [[1, 3], [3, 5]],
    [[2, 5], [4, 8]],
  ],
  // Corde voisine : 5 cases en arrière (4 depuis sol).
  'tip-02': [
    [[0, 5], [1, 0]],
    [[3, 7], [4, 3]],
  ],
  // Quarte puis quinte, sur la corde du dessus.
  'tip-04': [[[1, 3], [2, 3], [2, 5]]],
};

export function tipPairs(tipId: string): Cell[][] {
  return PAIRS[tipId] ?? [];
}

/** Les trois formes de sol majeur sur sol-si-mi qu'illustre le tip des renversements. */
const G_MAJOR = { root: 7, quality: 'maj' as const };

export function tipBoard(tipId: string, notation: Notation): Marker[] {
  if (tipId === 'tip-09') {
    const shapes = triadVoicings(G_MAJOR, 'sol-si-mi', 3, 15).filter(
      (v) => (v.inversion === 1 && v.frets[0] === 4) || (v.inversion === 2 && v.frets[0] === 7) || (v.inversion === 0 && v.frets[0] === 12),
    );
    return shapes.flatMap((v) =>
      v.frets.map((fret, i): Marker => {
        const string = 3 + i;
        return {
          string,
          fret,
          kind: pcAt(string, fret) === G_MAJOR.root ? 'root' : 'chord',
          label: String(v.inversion),
        };
      }),
    );
  }
  const markers: Marker[] = [];
  for (const group of tipPairs(tipId)) {
    group.forEach(([string, fret], index) => {
      markers.push({
        string,
        fret,
        kind: index === 0 ? 'root' : 'chord',
        label: noteName(pcAt(string, fret), notation, false),
        ring: index === 0,
      });
    });
  }
  return markers;
}
