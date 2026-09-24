export type ScaleId =
  | 'major' | 'minor' | 'majorPent' | 'minorPent' | 'blues'
  | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian' | 'harmonicMinor';

export interface ScaleDef {
  id: ScaleId;
  intervals: number[];
}

export const SCALES: ScaleDef[] = [
  { id: 'major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'majorPent', intervals: [0, 2, 4, 7, 9] },
  { id: 'minorPent', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', intervals: [0, 3, 5, 6, 7, 10] },
  { id: 'dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'harmonicMinor', intervals: [0, 2, 3, 5, 7, 8, 11] },
];

export const scaleById = (id: ScaleId) => SCALES.find((s) => s.id === id)!;
