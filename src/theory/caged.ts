import { Fret, FRET_COUNT, mod12 } from './notes';

export type CagedShape = 'C' | 'A' | 'G' | 'E' | 'D';
export type CagedQuality = 'maj' | 'min';

interface Template {
  root: number;
  frets: Fret[];
}

/** Open-position shapes (low E → high E), transposed by moving them up the neck. */
const TEMPLATES: Record<CagedQuality, Record<CagedShape, Template>> = {
  maj: {
    C: { root: 0, frets: [null, 3, 2, 0, 1, 0] },
    A: { root: 9, frets: [null, 0, 2, 2, 2, 0] },
    G: { root: 7, frets: [3, 2, 0, 0, 0, 3] },
    E: { root: 4, frets: [0, 2, 2, 1, 0, 0] },
    D: { root: 2, frets: [null, null, 0, 2, 3, 2] },
  },
  min: {
    C: { root: 0, frets: [null, 3, 1, 0, 1, null] },
    A: { root: 9, frets: [null, 0, 2, 2, 1, 0] },
    G: { root: 7, frets: [3, 1, 0, 0, 3, 3] },
    E: { root: 4, frets: [0, 2, 2, 0, 0, 0] },
    D: { root: 2, frets: [null, null, 0, 2, 3, 1] },
  },
};

export interface CagedPosition {
  shape: CagedShape;
  frets: Fret[];
  lo: number;
  hi: number;
}

export function getCagedShapes(root: number, quality: CagedQuality): CagedPosition[] {
  return (Object.keys(TEMPLATES[quality]) as CagedShape[])
    .map((shape) => {
      const t = TEMPLATES[quality][shape];
      const shift = mod12(root - t.root);
      let frets = t.frets.map((f) => (f === null ? null : f + shift));
      const used = frets.filter((f): f is number => f !== null);
      if (Math.min(...used) >= 12) frets = frets.map((f) => (f === null ? null : f - 12));
      const nums = frets.filter((f): f is number => f !== null);
      return { shape, frets, lo: Math.min(...nums), hi: Math.min(Math.max(...nums), FRET_COUNT) };
    })
    .sort((a, b) => a.lo - b.lo);
}
