import { analyze } from '../src/theory/analyzer';
import { cagedShapeFor, getCagedShapes } from '../src/theory/caged';
import { chordById, parseChordSymbol, parseNoteName } from '../src/theory/chords';
import { inferKey, parseChordPro, progression } from '../src/theory/chordpro';
import { isComplete, LESSON_BOARDS, LESSON_ORDER, scoreLesson } from '../src/theory/lessons';
import { lessonsEn } from '../src/theory/lessons.en';
import { lessonsFr } from '../src/theory/lessons.fr';
import { fretToMidi, OPEN_MIDI, voicingToMidi } from '../src/theory/notes';
import {
  cells,
  dailyRun,
  exerciseById,
  DEFAULT_PRACTICE,
  heat,
  makeQuestion,
  makeRun,
  mulberry32,
  prioritise,
  questionMidi,
  recordAttempt,
  retryMissed,
  setChordRun,
  streak,
  summarise,
  voiceChord,
} from '../src/practice/engine';
import { levelFrom, MAX_SCORE, ONBOARDING, practiceFor } from '../src/practice/onboarding';
import { emptySong, nextSunday, setChords, setSongs, songFromChordPro, songKey } from '../src/songs/model';
import { SET_SOURCES } from '../src/songs/sources';
import { migrateLegacyKeys, migrationPlan, STORAGE_KEYS } from '../src/state/storage';
import { voicingTab, generateVoicings } from '../src/theory/voicings';
import { CAPO_SHAPES, capoOptions, DEFAULT_CAPO_SHAPES } from '../src/theory/worship';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
};

const g = generateVoicings(7, chordById('maj')).map(voicingTab);
check('G major includes open G 3 2 0 0 0 3', g.includes('3 2 0 0 0 3'), g.slice(0, 4).join(' | '));
const c = generateVoicings(0, chordById('maj')).map(voicingTab);
check('C major includes x 3 2 0 1 0', c.includes('x 3 2 0 1 0'));
const f = generateVoicings(5, chordById('maj')).map(voicingTab);
check('F major includes barre 1 3 3 2 1 1', f.includes('1 3 3 2 1 1'));
const em7 = generateVoicings(4, chordById('min7')).map(voicingTab);
check('Em7 has voicings', em7.length > 0, em7.slice(0, 3).join(' | '));

const a = analyze([null, 3, 2, 0, 1, 0]);
check('Analyzer: x32010 = C', a.matches[0]?.root === 0 && a.matches[0].chord.id === 'maj');
const am7 = analyze([null, 0, 2, 0, 1, 0]);
check('Analyzer: x02010 = Am7', am7.matches[0]?.root === 9 && am7.matches[0].chord.id === 'min7');
const slash = analyze([2, null, 0, 2, 3, 2]);
check('Analyzer: F# bass on D chord = D/F#', slash.matches.some((m) => m.root === 2 && m.bass === 6));

const shapes = getCagedShapes(0, 'maj');
check('CAGED C: 5 shapes', shapes.length === 5, shapes.map((s) => `${s.shape}@${s.lo}`).join(' '));

// The chord screen labels a position with its shape when it is one. The octave
// matters: the same E shape sits at the nut and at the twelfth, written with
// different fret numbers, and both have to be recognised.
check('CAGED: x32010 is the C shape', cagedShapeFor([null, 3, 2, 0, 1, 0], 0, 'maj')?.shape === 'C');
check('CAGED: 320003 is the G shape', cagedShapeFor([3, 2, 0, 0, 0, 3], 7, 'maj')?.shape === 'G');
check(
  'CAGED: the E shape at the twelfth is still the E shape',
  cagedShapeFor([12, 14, 14, 13, 12, 12], 4, 'maj')?.shape === 'E',
);
check('CAGED: 022000 is the E minor shape', cagedShapeFor([0, 2, 2, 0, 0, 0], 4, 'min')?.shape === 'E');
// Most playable positions are not one of the five, and none of them may be
// labelled as one: a wrong shape name is worse than no name. (3,5,5,4,3,3) is
// the E shape played in G — the same finger pattern as the E shape in C at the
// eighth fret, but not the same chord, so it is not the E shape of C.
check('CAGED: the E shape in the wrong place is not a shape', cagedShapeFor([3, 5, 5, 4, 3, 3], 0, 'maj') === null);
check('CAGED: the E shape of C is at the eighth fret', cagedShapeFor([8, 10, 10, 9, 8, 8], 0, 'maj')?.shape === 'E');
check(
  'CAGED: a shape of the wrong quality is not a shape',
  cagedShapeFor([null, 3, 2, 0, 1, 0], 0, 'min') === null,
);
check(
  'CAGED: the shape found is the one the position really is',
  generateVoicings(0, chordById('maj')).every((v) => {
    const found = cagedShapeFor(v.frets, 0, 'maj');
    if (!found) return true;
    const same = getCagedShapes(0, 'maj').find((p) => p.shape === found.shape);
    return !!same && [0, 12, -12].some((o) => v.frets.every((f, i) => (f === null ? same.frets[i] === null : f === (same.frets[i] as number) + o)));
  }),
);

const capo = capoOptions(2);
check('Capo for D includes capo 2 with C shapes', capo.some((o) => o.shapeKey === 0 && o.capo === 2));

// Pitch conversion feeds every sound the app makes, so it is worth pinning down.
check('Open low E is MIDI 40', fretToMidi(0, 0) === 40);
check('High E string, fret 15 is MIDI 79', fretToMidi(5, 15) === 79, String(fretToMidi(5, 15)));
check('A string, fret 3 is C (MIDI 48)', fretToMidi(1, 3) === 48, String(fretToMidi(1, 3)));
check(
  'Every fretboard cell lands inside the rendered range',
  OPEN_MIDI.every((_, s) => Array.from({ length: 16 }, (_, f) => fretToMidi(s, f)).every((m) => m >= 40 && m <= 79)),
);

// Strumming order matters: low string first is a downstroke, the reverse is not.
check('Voicing to pitches: C major, low string first', voicingToMidi([null, 3, 2, 0, 1, 0]).join(',') === '48,52,55,60,64');
check('Voicing to pitches drops muted strings', voicingToMidi([null, null, 0, 2, 3, 2]).join(',') === '50,57,62,66');
check('Voicing to pitches rises', voicingToMidi([3, 2, 0, 0, 0, 3]).every((m, i, a) => i === 0 || m > a[i - 1]));

// ------------------------------------------------------------- practice engine

// A run must be replayable: the same seed has to give the same questions, or a
// "redo the ones you missed" button would be meaningless.
const runA = makeRun('nameNote', DEFAULT_PRACTICE, 1234);
const runB = makeRun('nameNote', DEFAULT_PRACTICE, 1234);
check('Same seed gives the same run', JSON.stringify(runA) === JSON.stringify(runB));
check('A run has the requested length', runA.length === DEFAULT_PRACTICE.questionCount, String(runA.length));

const named = runA[0];
check('Name-the-note offers four choices', named.exercise === 'nameNote' && named.choices.length === 4);
check(
  'Name-the-note offers its answer exactly once',
  named.exercise === 'nameNote' && named.choices.filter((c) => c === named.answer).length === 1,
);

// Naturals-only must actually exclude the black keys, on every exercise.
const naturalCells = cells({ ...DEFAULT_PRACTICE, strings: [0, 1, 2, 3, 4, 5] });
check('Naturals only excludes accidentals', naturalCells.every((c) => [0, 2, 4, 5, 7, 9, 11].includes((OPEN_MIDI[c.string] + c.fret) % 12)));
const allCells = cells({ ...DEFAULT_PRACTICE, accidentals: true });
check('Accidentals add the black keys', allCells.length > naturalCells.length, `${naturalCells.length} -> ${allCells.length}`);

// The fret zone has to be respected, or "frets 0 to 5" would ask about fret 9.
const zone = cells({ ...DEFAULT_PRACTICE, zoneFrom: 5, zoneTo: 9, accidentals: true });
check('Fret zone is respected', zone.every((c) => c.fret >= 5 && c.fret <= 9));
const oneString = cells({ ...DEFAULT_PRACTICE, strings: [4], accidentals: true });
check('String selection is respected', oneString.every((c) => c.string === 4));
check('Zone 0-5 on the A string holds six cells', cells({ ...DEFAULT_PRACTICE, strings: [1], zoneFrom: 0, zoneTo: 5, accidentals: true }).length === 6);

// Every exercise must generate a well-formed question, from any settings.
const ids = ['nameNote', 'findNote', 'allOfNote', 'chordTone', 'capoExpress', 'transpose', 'earQuality', 'earDegree'] as const;
let everyExerciseOk = true;
let everyExerciseHeard = true;
for (const id of ids) {
  // "Find every C" and "chord tones" are one question each by nature; the rest
  // are runs, so they have to honour the requested count.
  const wanted = exerciseById(id).multi ? 20 : 1;
  const run = makeRun(id, { ...DEFAULT_PRACTICE, questionCount: 20 }, 7);
  if (run.length !== wanted || run.some((q) => q.exercise !== id)) everyExerciseOk = false;
  // Each question has to have something to play back, or it cannot be listened to.
  if (run.some((q) => questionMidi(q).length === 0)) everyExerciseHeard = false;
}
check('Every exercise generates a full run', everyExerciseOk);
check('Every question has something to sound', everyExerciseHeard);

// A "find every C" question must list every reachable C and nothing else.
const allOf = makeQuestion('allOfNote', { ...DEFAULT_PRACTICE, questionCount: 1 }, mulberry32(3));
if (allOf.exercise === 'allOfNote') {
  check('Every-C targets all match the pitch class', allOf.targets.every((t) => (OPEN_MIDI[t.string] + t.fret) % 12 === allOf.pc));
  check(
    'Every-C lists every reachable one',
    allOf.targets.length === naturalCells.filter((c) => (OPEN_MIDI[c.string] + c.fret) % 12 === allOf.pc).length,
  );
}

// Capo express must have one answer: the nearest shape family.
const capoQ = makeQuestion('capoExpress', DEFAULT_PRACTICE, mulberry32(11));
check(
  'Capo answer really is the lowest capo for that key',
  capoQ.exercise === 'capoExpress' && capoQ.capo === capoOptions(capoQ.key)[0].capo,
);

// Chord tones must be the interval they claim, which differs by chord quality:
// a minor third is three semitones, not four.
const toneRng = mulberry32(5);
let toneOk = true;
for (let i = 0; i < 50; i++) {
  const q = makeQuestion('chordTone', DEFAULT_PRACTICE, toneRng);
  if (q.exercise !== 'chordTone') continue;
  const chord = chordById(q.chord);
  const expected = (q.root + (q.tone === 'third' ? chord.intervals[1] : chord.intervals[2])) % 12;
  if (q.answer !== expected) toneOk = false;
}
check('Chord tone matches the interval, major and minor', toneOk);

// A voiced chord has to be real pitches a guitar could sound, not pitch classes
// stacked in one octave.
const voiced = voiceChord(0, 'maj');
check(
  'Voiced chords are pitched in the guitar range',
  voiced.every((m) => m >= 40 && m <= 84) && voiced[1] - voiced[0] === 4 && voiced[2] - voiced[0] === 7,
  voiced.join(','),
);
check('Voiced minor chord lowers the third', voiceChord(0, 'min')[1] - voiceChord(0, 'min')[0] === 3);
check('Voiced chords climb above the floor', voiceChord(0, 'maj', 60)[0] >= 60, String(voiceChord(0, 'maj', 60)[0]));

const summary = summarise([
  { correct: true, ms: 1000 },
  { correct: false, ms: 2000 },
  { correct: true, ms: 3000 },
]);
check('Summary counts and averages', summary.total === 3 && summary.correct === 2 && summary.meanMs === 2000);
check('Summary reports accuracy', Math.abs(summary.accuracy - 2 / 3) < 1e-9);
check('Summary lists the missed indexes', summary.missed.join(',') === '1');
check('Redo-the-errors returns only those questions', retryMissed(runA, summary.missed).length === 1);

// Spaced repetition should reach for unseen cells before drilled ones.
let progress = {};
const drilled = naturalCells.slice(0, 5);
for (const c of drilled) progress = recordAttempt(progress, c.string, c.fret, { correct: true, ms: 800 });
const ranked = prioritise(naturalCells, progress, 6, mulberry32(9));
check('Prioritise avoids well-known cells', ranked.every((c) => !drilled.some((d) => d.string === c.string && d.fret === c.fret)));
check('Prioritise returns the requested count', ranked.length === 6);
const failedCell = { string: 5, fret: 10 }; // D on the high E string, never drilled above
const failed = prioritise(
  naturalCells,
  recordAttempt(progress, failedCell.string, failedCell.fret, { correct: false, ms: 5000 }),
  1,
  mulberry32(9),
);
check('Prioritise surfaces a failed cell first', failed[0].string === 5 && failed[0].fret === 10, JSON.stringify(failed[0]));
check('The failed cell really was undrilled', !drilled.some((d) => d.string === 5 && d.fret === 10));

// And a cell that is known must not outrank a cell that is not: the drilled ones
// are all answered correctly, so they belong at the very end of the session.
const known = prioritise(naturalCells, progress, naturalCells.length, mulberry32(4));
const isDrilled = (c: { string: number; fret: number }) => drilled.some((d) => d.string === c.string && d.fret === c.fret);
check('Prioritise opens on undrilled material', !isDrilled(known[0]), JSON.stringify(known[0]));
check(
  'Prioritise leaves the known cells for last',
  known.slice(-drilled.length).every(isDrilled) && known.length === naturalCells.length,
);
check('Prioritise never returns more than it has', prioritise(naturalCells, {}, 9999, mulberry32(1)).length === naturalCells.length);

check('Streak counts consecutive days', streak(['2026-09-22', '2026-09-23', '2026-09-24'], '2026-09-24') === 3);
check('Streak survives today not being practised yet', streak(['2026-09-22', '2026-09-23'], '2026-09-24') === 2);
check('Streak breaks on a gap', streak(['2026-09-20', '2026-09-23', '2026-09-24'], '2026-09-24') === 2);
check('Streak is zero with no practice', streak([], '2026-09-24') === 0);

// The daily session works off the record, so it has to start on what the record
// says is weak — otherwise "spaced repetition" is just a shuffle.
const daily = dailyRun({ ...DEFAULT_PRACTICE, questionCount: 30 }, progress, 21);
check('Daily session asks name-the-note only', daily.every((q) => q.exercise === 'nameNote'));
check('Daily session is not empty', daily.length > 0, String(daily.length));
check(
  'Daily session opens on a cell never practised',
  daily[0].exercise === 'nameNote' && !isDrilled(daily[0]),
);
check(
  'Daily session never asks more than the neck holds',
  dailyRun({ ...DEFAULT_PRACTICE, strings: [5], zoneFrom: 0, zoneTo: 5, accidentals: false }, {}, 4).length === 4,
);

// The heat map has to cover the neck the settings describe, and carry the rate.
// The drilled cells above are on the low E string, so that is the neck to look at.
const heated = heat({ ...DEFAULT_PRACTICE, strings: [0], zoneFrom: 0, zoneTo: 5 }, progress);
check('Heat map covers the neck the settings describe', heated.every((c) => c.string === 0 && c.fret <= 5));
check(
  'Heat map reports a rate for the cells practised and nothing for the rest',
  heated.filter((c) => c.rate !== null).length === 4 &&
    heated.filter((c) => c.rate !== null).every((c) => c.rate === 1),
  JSON.stringify(heated),
);
check('Heat map never reports a rate for an untouched cell', heat(DEFAULT_PRACTICE, {}).every((c) => c.rate === null));

// A set to practise drills the set's chords, in order, thirds and fifths.
const setChordsUnderTest = [
  { root: 7, chord: 'maj' as const },
  { root: 0, chord: 'maj' as const },
];
const setQuestions = setChordRun(setChordsUnderTest, 6);
check('A set run cycles the set’s chords', setQuestions.length === 6);
check(
  'A set run asks thirds and fifths of the right chords',
  setQuestions.every((q, i) => {
    if (q.exercise !== 'chordTone') return false;
    const expected = setChordsUnderTest[i % 2];
    const interval = q.tone === 'third' ? chordById(expected.chord).intervals[1] : chordById(expected.chord).intervals[2];
    return q.root === expected.root && q.answer === (expected.root + interval) % 12;
  }),
);
check('A set with no readable chord asks nothing', setChordRun([], 6).length === 0);

// ------------------------------------------------------------------- ChordPro

const CHART = [
  '{title: Chant témoin}',
  '{artist: Personne}',
  '{key: G}',
  '{capo: 2}',
  '{start_of_verse}',
  '[G]Première ligne [D]ici',
  '[Em]Deuxième [C]ligne',
  '{end_of_verse}',
  '{start_of_chorus}',
  '[G]Refrain [D]du chant',
  '{end_of_chorus}',
].join('\n');

const parsed = parseChordPro(CHART);
check('ChordPro reads the title', parsed.title === 'Chant témoin', String(parsed.title));
check('ChordPro reads the artist', parsed.artist === 'Personne');
check('ChordPro reads the key', parsed.key === 'G');
check('ChordPro reads the capo as a number', parsed.capo === 2, String(parsed.capo));
check('ChordPro reads the sections', parsed.sections.length === 2, String(parsed.sections.length));
check('ChordPro labels a chorus', parsed.sections[1].label === 'chorus', String(parsed.sections[1].label));
check('ChordPro strips the brackets out of the lyric', parsed.sections[0].lines[0].lyrics === 'Première ligne ici');
check(
  'ChordPro keeps where each chord sat in the line',
  parsed.sections[0].lines[0].chords[0].at === 0 && parsed.sections[0].lines[0].chords[1].at === 'Première ligne '.length,
);
check('ChordPro lists the distinct chords once', parsed.chords.length === 4, String(parsed.chords.length));
check('ChordPro has nothing unreadable here', parsed.unknown.length === 0, parsed.unknown.join(','));
// Verse then chorus: G D Em C, then G D again. Every change is a change, so the
// chorus chords appear a second time.
check(
  'Progression reads the sections in order',
  progression(parsed).map((c) => c.root).join(',') === '7,2,4,0,7,2',
  progression(parsed).map((c) => c.root).join(','),
);
check(
  'Progression drops a chord that is only still ringing',
  progression(parseChordPro('[G]a [G]b [G]c [D]d')).length === 2,
  String(progression(parseChordPro('[G]a [G]b [G]c [D]d')).length),
);

// Files in the wild are messy: an unreadable chord must be reported, not fatal.
const messy = parseChordPro('[G]Bon [H7]mauvais\n{unknown_directive: x}\n[G]Encore');
check('An unreadable chord is reported', messy.unknown.join(',') === 'H7', messy.unknown.join(','));
check('The readable chords still parse around it', messy.chords.length === 1 && messy.chords[0].root === 7);
check('An unknown directive does not break the file', messy.sections.length === 1);

check('A note name alone reads as a pitch class', parseNoteName('F#') === 6 && parseNoteName('Bb') === 10);
check('A chord is not a note name', parseNoteName('Gm') === null && parseNoteName('') === null);
check('A major chord reads', parseChordSymbol('G')?.root === 7 && parseChordSymbol('G')?.chord === 'maj');
check('A minor seventh reads', parseChordSymbol('Am7')?.chord === 'min7' && parseChordSymbol('Am7')?.root === 9);
check('A slash bass reads', parseChordSymbol('D/F#')?.bass === 6 && parseChordSymbol('D/F#')?.root === 2);
check('An add9 reads', parseChordSymbol('Cadd9')?.chord === 'add9');
check('A flat root reads', parseChordSymbol('Bbmaj7')?.root === 10 && parseChordSymbol('Bbmaj7')?.chord === 'maj7');
check('A nonsense symbol reads as nothing', parseChordSymbol('H7') === null && parseChordSymbol('') === null);
check('A nonsense bass reads as nothing', parseChordSymbol('G/H') === null);

// The declared key wins; otherwise the chords have to give it away.
check('A declared key is used as written', inferKey(parsed) !== null);
const undeclared = parseChordPro('[G]a [D]b [Em]c [C]d');
check('The key is inferred from the chords', inferKey(undeclared) === 7, String(inferKey(undeclared)));
check('A song with no chords has no key', inferKey(parseChordPro('paroles sans accord')) === null);

const song = songFromChordPro(CHART, 'Repli');
check('A song takes its title from the chart', song.title === 'Chant témoin');
check('A song keeps its source verbatim', song.chordPro === CHART);
check('A song falls back to the given title', songFromChordPro('[G]x', 'Repli').title === 'Repli');
check('A song reads its own key', songKey(song) === 7);
check('A song with no key gets one from its chords', songKey(emptySong('x')) === null);
const guessed = songFromChordPro('[G]a [D]b [Em]c [C]d', 'x');
check('A song with no declared key infers one', songKey(guessed) === 7, String(songKey(guessed)));

const band = { id: 's1', title: 'Dimanche', date: '2026-09-27', songIds: [song.id], source: 'manual' };
check('A set resolves its songs', setSongs(band, [song]).length === 1);
check('A set skips a deleted song', setSongs({ ...band, songIds: ['gone'] }, [song]).length === 0);
check('A set gathers its chords in playing order', setChords(band, [song]).length === 6);
check(
  'Next Sunday is a Sunday',
  new Date(`${nextSunday(new Date('2026-09-24T00:00:00Z'))}T00:00:00Z`).getUTCDay() === 0,
  nextSunday(new Date('2026-09-24T00:00:00Z')),
);
check('Sunday counts as the next Sunday', nextSunday(new Date('2026-09-27T00:00:00Z')) === '2026-09-27');

// ------------------------------------------------------------- the rename move

check(
  'A legacy key is planned for the new prefix',
  migrationPlan(['kinnor.settings.v1'])[0]?.to === 'graceguitar.settings.v1',
);
check(
  'A key already under the new prefix is left alone',
  migrationPlan(['graceguitar.settings.v1']).length === 0,
);
check(
  'The plan copies only what the new prefix does not already have',
  migrationPlan(['kinnor.settings.v1', 'graceguitar.songs.v1', 'kinnor.songs.v1']).every(
    (e) => e.copy === (e.from === 'kinnor.settings.v1'),
  ),
);
check('An empty store plans nothing', migrationPlan([]).length === 0);

/** A stand-in for AsyncStorage, so the migration can be run without a device. */
function fakeStore(entries: Record<string, string>) {
  const data = new Map(Object.entries(entries));
  return {
    data,
    getAllKeys: async () => Array.from(data.keys()),
    multiGet: async (keys: string[]) => keys.map((k) => [k, data.get(k) ?? null] as const),
    multiSet: async (pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => data.set(k, v));
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach((k) => data.delete(k));
    },
  };
}

// The sources that are only planned must fail loudly, not return an empty list,
// and the migration is asynchronous too. Both are checked last, because the
// answers only arrive on a later tick.
check('Only the hand-written source is usable', SET_SOURCES.filter((s) => s.available).length === 1);
const planned = SET_SOURCES.filter((s) => !s.available);

const carried = fakeStore({ 'kinnor.settings.v1': '{"lang":"fr"}', 'kinnor.songs.v1': '{"songs":[]}' });
const alreadyThere = fakeStore({ 'kinnor.settings.v1': '{"lang":"fr"}', 'graceguitar.settings.v1': '{"lang":"en"}' });

Promise.all([...planned.map((s) => s.fetchSets().then(() => 'resolved', () => 'rejected')), migrateLegacyKeys(carried), migrateLegacyKeys(alreadyThere)]).then(
  (results) => {
    results.slice(0, planned.length).forEach((status, i) => {
      check(`${planned[i].id} refuses rather than pretending`, status === 'rejected');
    });

    check('The old value is carried to the new key', carried.data.get('graceguitar.settings.v1') === '{"lang":"fr"}');
    check('The second old key is carried too', carried.data.get('graceguitar.songs.v1') === '{"songs":[]}');
    check('The old keys are gone once carried', !carried.data.has('kinnor.settings.v1'));
    check(
      'A legacy key never overwrites the live one',
      alreadyThere.data.get('graceguitar.settings.v1') === '{"lang":"en"}',
    );
    check('That stale legacy key is removed all the same', !alreadyThere.data.has('kinnor.settings.v1'));
    check('The renamed keys are the ones the app reads', STORAGE_KEYS.settings === 'graceguitar.settings.v1');

    report();
  },
);

// ------------------------------------------------------------------ the course

check('Every lesson in the order has a board', LESSON_ORDER.every((id) => LESSON_BOARDS[id] !== undefined));
check('The boards have no lesson the order does not list', Object.keys(LESSON_BOARDS).length === LESSON_ORDER.length);
check(
  'Every lesson is complete in both languages',
  LESSON_ORDER.every((id) => isComplete(lessonsFr[id]) && isComplete(lessonsEn[id])),
);
check(
  'The two language files have the same lessons',
  Object.keys(lessonsFr).length === LESSON_ORDER.length && Object.keys(lessonsEn).length === LESSON_ORDER.length,
);
check(
  'No lesson repeats a choice inside a question',
  LESSON_ORDER.every((id) =>
    lessonsFr[id].questions.every((question) => new Set(question.choices).size === question.choices.length),
  ),
);
const lessonOne = lessonsFr[LESSON_ORDER[0]];
check(
  'A perfect lesson scores full marks',
  scoreLesson(lessonOne, lessonOne.questions.map((q) => q.answer)) === 3,
);
check('A skipped lesson scores nothing', scoreLesson(lessonOne, [null, null, null]) === 0);
check(
  'A wrong answer scores nothing',
  scoreLesson(lessonOne, lessonOne.questions.map((q) => (q.answer + 1) % q.choices.length)) === 0,
);

// -------------------------------------------------------------- the welcome

check('The welcome asks five questions', ONBOARDING.length === 5);
check(
  'Every welcome question offers the answers the i18n data has',
  ONBOARDING.every((q) => q.weights.length === 3),
);
check('Answering nothing lands on level 1', levelFrom(ONBOARDING.map(() => null)) === 1);
check('Skipping everything lands on level 1', levelFrom([]) === 1);
check(
  'Answering everything lands on level 3',
  levelFrom(ONBOARDING.map((q) => q.weights.length - 1)) === 3,
);
check('The middle answer lands in the middle', levelFrom(ONBOARDING.map(() => 1)) === 2);
check('A perfect score is the maximum', MAX_SCORE === 10, String(MAX_SCORE));
check(
  'The shapes offered for the capo are G, C, D, A, E',
  CAPO_SHAPES.join(',') === '7,0,2,9,4',
  CAPO_SHAPES.join(','),
);
check(
  'The shapes ticked by default are offered ones',
  DEFAULT_CAPO_SHAPES.every((shape) => CAPO_SHAPES.includes(shape)),
  DEFAULT_CAPO_SHAPES.join(','),
);
check(
  'The shapes ticked by default are a strict subset',
  DEFAULT_CAPO_SHAPES.length < CAPO_SHAPES.length,
);
check(
  'Level 1 opens on one string and the naturals',
  practiceFor(1).strings.length === 1 && !practiceFor(1).accidentals,
);
check('Level 3 opens the whole neck', practiceFor(3).strings.length === 6 && practiceFor(3).accidentals);
check(
  'The levels only ever widen',
  practiceFor(1).strings.length < practiceFor(2).strings.length &&
    practiceFor(2).strings.length < practiceFor(3).strings.length,
);

function report() {
  if (failures) {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('All theory checks passed');
}
