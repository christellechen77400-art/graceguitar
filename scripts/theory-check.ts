import { analyze } from '../src/theory/analyzer';
import { cagedShapeFor, getCagedShapes } from '../src/theory/caged';
import { chordById, parseChordSymbol, parseNoteName } from '../src/theory/chords';
import { inferKey, parseChordPro, progression, sectionBars } from '../src/songs/chordpro';
import { isComplete, LESSON_BOARDS, LESSON_ORDER, scoreLesson } from '../src/theory/lessons';
import { lessonsEn } from '../src/theory/lessons.en';
import { lessonsFr } from '../src/theory/lessons.fr';
import {
  BASS_DEGREES,
  chordToNashville,
  EDITOR_DEGREES,
  freeChordToNashville,
  NashvilleChord,
  nashvilleLabel,
  nashvilleToChord,
  withBass,
} from '../src/theory/nashville';
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
import { dailySession, rotationFor, CHORDS_EAR, THEORY } from '../src/practice/daily';
import { homeSections, isSundayMode } from '../src/home/order';
import { fold, nextSet, recentSongs, searchSongs, sundayNeedsSongs } from '../src/songs/library';
import {
  adoptShared,
  base64UrlEncode,
  readSharedLink,
  readSharedPayload,
  shareLink,
  shareSet,
  SHARE_PREFIX,
} from '../src/songs/share';
import { emptySong, nextSunday, nextSundays, setChords, setSongs, Song, WorshipSet } from '../src/songs/model';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { formatDay, sectionLabel } from '../src/i18n';
import { songFromChordPro } from '../src/songs/import';
import { migrateLibrary } from '../src/songs/migrate';
import { SET_SOURCES } from '../src/songs/sources';
import { migrateLegacyKeys, migrationPlan, STORAGE_KEYS } from '../src/state/storage';
import { voicingTab, generateVoicings } from '../src/theory/voicings';
import { CAPO_SHAPES, capoOptions, DEFAULT_CAPO_SHAPES, probableChords, suggestCapo } from '../src/theory/worship';

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
check('A song keeps its own key', song.defaultKey === 7, String(song.defaultKey));
check('A song falls back to the given title', songFromChordPro('[G]x', 'Repli').title === 'Repli');
check(
  'A song stores its grid as Nashville numbers',
  song.sections?.[0].bars.join(' ') === '1 5 6m 4',
  song.sections?.[0].bars.join(' '),
);
check('A song keeps each section apart', song.sections?.length === 2 && song.sections[1].name === 'chorus');
check('A song keeps its words on the device', (song.lyrics ?? '').includes('Première ligne ici'));
check('A chart with no chord is only a key', songFromChordPro('paroles sans accord', 'x').sections === undefined);
check('A minor chart reads as minor', songFromChordPro('[Am]a [Dm]b [Em]c [Am]d', 'x').mode === 'minor');
// Am F C G is the vi-IV-I-V of C, not a song in A minor: the key inferred has to
// match the chords the chart actually uses.
check(
  'A major chart reads as major',
  songFromChordPro('[Am]a [F]b [C]c [G]d', 'x').defaultKey === 0 && song.mode === 'major',
);
check('A song with no declared key infers one', songFromChordPro('[G]a [D]b [Em]c [C]d', 'x').defaultKey === 7);

// A song with no grid still has a key, which is what the sheet shows.
check('A song typed in by hand has no grid', emptySong('x', 0).sections === undefined);

const entry = { songId: song.id, key: 7, capo: 2, order: 0 };
const band: WorshipSet = { id: 's1', date: '2026-09-27', serviceName: 'Dimanche', songs: [entry], source: 'manual' };
check('A set resolves its songs', setSongs(band, [song]).length === 1);
check('A set skips a deleted song', setSongs({ ...band, songs: [{ ...entry, songId: 'gone' }] }, [song]).length === 0);
check('A set gathers its chords in playing order', setChords(band, [song]).length === 6);
// The set plays the song in the key of the day, not the one it was written in.
check('A set plays a song in its own key', setChords({ ...band, songs: [{ ...entry, key: 2 }] }, [song])[0].root === 2);
check(
  'Next Sunday is a Sunday',
  new Date(`${nextSunday(new Date('2026-09-24T00:00:00Z'))}T00:00:00Z`).getUTCDay() === 0,
  nextSunday(new Date('2026-09-24T00:00:00Z')),
);
check('Sunday counts as the next Sunday', nextSunday(new Date('2026-09-27T00:00:00Z')) === '2026-09-27');

// ------------------------------------------------------------------ Nashville

const inG = (degree: string) => nashvilleToChord(degree, 7, 'major');
/** A degree read back as written, or a readable stand-in when it is unreadable. */
const chalk = (chord: NashvilleChord | null) => (chord ? chordToNashville(chord, 7) : 'unreadable');
check('1 in G is G', inG('1')?.root === 7 && inG('1')?.chord === 'maj');
check('4 in G is C', inG('4')?.root === 0 && inG('4')?.chord === 'maj');
check('6m in G is Em', inG('6m')?.root === 4 && inG('6m')?.chord === 'min');
check('2m7 in G is Am7', inG('2m7')?.root === 9 && inG('2m7')?.chord === 'min7');
check('7° in G is F#dim', inG('7°')?.root === 6 && inG('7°')?.chord === 'dim');
check('5/7 in G is D over F#', inG('5/7')?.root === 2 && inG('5/7')?.bass === 6);
check('A minor degree uses the minor scale', nashvilleToChord('1m', 9, 'minor')?.root === 9);
check('A nonsense degree reads as nothing', inG('9') === null && inG('x') === null);

check('D/F# in G is 5/7', chordToNashville({ root: 2, chord: 'maj', bass: 6 }, 7) === '5/7');
check('Em in G is 6m', chordToNashville({ root: 4, chord: 'min', bass: null }, 7) === '6m');
check('A chord out of the key takes a flat', chordToNashville({ root: 5, chord: 'maj', bass: null }, 7) === '♭7');
check('A chord reads back as itself', chalk(inG('5/7')) === '5/7', chalk(inG('5/7')));
check(
  'The label spells the bass too',
  nashvilleLabel({ root: 2, chord: 'maj', bass: 6 }, 7, 'major', 'anglo') === 'D/F♯',
  nashvilleLabel({ root: 2, chord: 'maj', bass: 6 }, 7, 'major', 'anglo'),
);
check(
  'A flat key spells its chords with flats',
  nashvilleLabel({ root: 10, chord: 'maj', bass: null }, 10, 'major', 'anglo') === 'B♭',
  nashvilleLabel({ root: 10, chord: 'maj', bass: null }, 10, 'major', 'anglo'),
);

check('A section reads as Nashville bars', sectionBars(parsed.sections[0], 7, 'major').join(' ') === '1 5 6m 4');

check(
  'The probable chords come in worship order',
  probableChords(7).map((c) => c.nashville).join(' ') === '1 4 5 6m 2m 3m',
  probableChords(7).map((c) => c.nashville).join(' '),
);
check('The probable chords of G are the right ones', probableChords(7).map((c) => c.chord.root).join(',') === '7,0,2,4,9,11');
check('A minor key has its own probable chords', probableChords(9, 'minor')[0].nashville === '1m');
check(
  'Every probable chord reads back as written',
  probableChords(7).every((c) => chordToNashville(c.chord, 7) === c.nashville),
  probableChords(7).map((c) => chordToNashville(c.chord, 7)).join(' '),
);

check('A preferred shape needs no capo when it fits', suggestCapo(7, [7, 0, 2]) === 0);
check('A preferred shape finds the lowest capo', suggestCapo(9, [7, 0, 2]) === 2, String(suggestCapo(9, [7, 0, 2])));
check('No preference falls back on the open shapes', suggestCapo(5, []) === 1, String(suggestCapo(5, [])));
check('A capo never goes past the seventh fret', suggestCapo(6, [1]) <= 7, String(suggestCapo(6, [1])));

// ------------------------------------------------ the lot 2 library, moved over

const legacy = migrateLibrary({
  songs: [
    { id: 'a', title: 'Chant', artist: '', key: 7, capo: 3, chordPro: CHART },
    { id: 'b', title: 'Sans grille', artist: '', key: null, capo: null, chordPro: '' },
  ],
  sets: [
    { id: 's', title: 'Culte du soir', date: '2026-09-27', songIds: ['a', 'b', 'disparu'], source: 'manual' },
  ],
});
check('A legacy song keeps its id', legacy.songs[0].id === 'a');
check('A legacy song keeps its key', legacy.songs[0].defaultKey === 7);
check('A legacy chart becomes a grid', legacy.songs[0].sections?.[0].bars.join(' ') === '1 5 6m 4');
check('A legacy song with no chart keeps its key only', legacy.songs[1].sections === undefined);
check('A legacy set becomes ordered entries', legacy.sets[0].songs.map((e) => e.order).join(',') === '0,1');
check('A legacy set drops a song it no longer has', legacy.sets[0].songs.length === 2);
check('A legacy capo moves onto the set entry', legacy.sets[0].songs[0].capo === 3);
check('A legacy set title becomes the service name', legacy.sets[0].serviceName === 'Culte du soir');
check('A legacy set entry starts in the song key', legacy.sets[0].songs[1].key === 0);
check('A blob that is not a library gives an empty one', migrateLibrary(null).songs.length === 0);
check('A blob with junk songs keeps none', migrateLibrary({ songs: [null, 3] }).songs.length === 0);

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

// --------------------------------------------------------- la saisie de grille

// A chord outside the scale is written with an accidental, and has to read back:
// a ♭VII typed into the grid would otherwise show as an unreadable bar.
const flatSeven = chordToNashville({ root: 10, chord: 'maj', bass: null }, 0);
check('A flattened seventh is written with a flat', flatSeven === '♭7', flatSeven);
check(
  'A flattened degree reads back as the chord it names',
  nashvilleToChord('♭7', 0, 'major')?.root === 10,
);
check(
  'A sharpened degree reads back too',
  nashvilleToChord('♯4m', 0, 'major')?.root === 6 && nashvilleToChord('♯4m', 0, 'major')?.chord === 'min',
);
// In A minor the seventh is G; flattened, it is the F♯ a semitone below.
check(
  'A minor seventh is the natural seventh of the key',
  nashvilleToChord('7', 9, 'minor')?.root === 7,
  String(nashvilleToChord('7', 9, 'minor')?.root),
);
check('A flattened degree of a minor key reads back', nashvilleToChord('♭7', 9, 'minor')?.root === 6);

check('The keyboard offers the degrees a grid uses', EDITOR_DEGREES.join(' ') === '1 2m 3m 4 5 6m 7°');
check(
  'Every key of the keyboard is a readable bar',
  EDITOR_DEGREES.every((degree) => nashvilleToChord(degree, 7, 'major') !== null),
);
check('The bass key offers the seven degrees', BASS_DEGREES.length === 7);
check(
  'Every bass degree is a readable bar',
  BASS_DEGREES.every((degree) => nashvilleToChord(withBass('5', degree), 7, 'major') !== null),
);
check('A bass is added to a bar', withBass('5', '7') === '5/7');
check('A bass is removed from a bar', withBass('5/7', null) === '5');
check('A bass is replaced, not stacked', withBass('5/7', '2') === '5/2');
check('A bass on a quality keeps the quality', withBass('2m7', '4') === '2m7/4');
check(
  'A bar with a bass still reads as its chord',
  nashvilleToChord(withBass('5', '7'), 7, 'major')?.bass === 6,
);

check('A free chord becomes its degree', freeChordToNashville('D', 7, 'major') === '5');
check('A free minor chord keeps its quality', freeChordToNashville('Em7', 7, 'major') === '6m7');
check('A free chord outside the scale takes an accidental', freeChordToNashville('F', 7, 'major') === '♭7');
check('A free slash chord keeps its bass', freeChordToNashville('D/F#', 7, 'major') === '5/7');
check('A free chord ignores case and spaces', freeChordToNashville('  em7 ', 7, 'major') === '6m7');
check('A word that is not a chord is refused', freeChordToNashville('bonjour', 7, 'major') === null);
check('An empty entry is refused', freeChordToNashville('   ', 7, 'major') === null);
check(
  'Every free chord the reader accepts can be read back',
  ['C', 'Am', 'F#m7', 'Bb', 'G/B', 'Cadd9', 'Dsus4', 'E7'].every((text) => {
    const degree = freeChordToNashville(text, 7, 'major');
    return degree !== null && nashvilleToChord(degree, 7, 'major') !== null;
  }),
);

// ------------------------------------------------------------------ les dates

// A set is dated on a Sunday, so the sheet offers the coming ones rather than a
// text field. 2026-09-24 is a Thursday.
const thursday = new Date('2026-09-24T12:00:00.000Z');
check('The next Sunday after a Thursday is the 27th', nextSunday(thursday) === '2026-09-27');
check('A Sunday is its own next Sunday', nextSunday(new Date('2026-09-27T12:00:00.000Z')) === '2026-09-27');
check('Four Sundays are offered', nextSundays(4, thursday).length === 4);
check(
  'The Sundays are a week apart',
  nextSundays(4, thursday).join(',') === '2026-09-27,2026-10-04,2026-10-11,2026-10-18',
  nextSundays(4, thursday).join(','),
);
// Crossing a month end and a year end are the two ways a date helper goes wrong.
check(
  'Sundays cross a month without slipping',
  nextSundays(3, new Date('2026-12-29T12:00:00.000Z')).join(',') === '2027-01-03,2027-01-10,2027-01-17',
  nextSundays(3, new Date('2026-12-29T12:00:00.000Z')).join(','),
);
check('A date reads in French', formatDay('2026-09-27', fr) === 'dimanche 27 septembre', formatDay('2026-09-27', fr));
check('A date reads in English', formatDay('2026-09-27', en) === 'Sunday 27 September', formatDay('2026-09-27', en));
// A date is a day, not an instant: read in a western timezone without `Date.UTC`
// it would come back as the 26th.
check('A date does not slip a day', formatDay('2026-01-01', fr) === 'jeudi 1 janvier', formatDay('2026-01-01', fr));
check('Something that is not a date is left alone', formatDay('pas-une-date', fr) === 'pas-une-date');

check('A known section is translated', sectionLabel('verse', fr) === 'Couplet');
check('A section name in English is translated too', sectionLabel('chorus', en) === 'Chorus');
// A chart imported from elsewhere names its own sections; inventing a translation
// for a name the app has never heard of would be guessing.
check('An unknown section keeps its name', sectionLabel('Pre-chorus', fr) === 'Pre-chorus');

// ------------------------------------------------------------------ la séance

const today = dailySession(DEFAULT_PRACTICE, {}, 20260924);
check('The day has three exercises', today.exercises.length === 3, String(today.exercises.length));
check(
  'Each exercise has ten questions',
  today.exercises.every((e) => e.questions.length === 10),
  today.exercises.map((e) => `${e.id}:${e.questions.length}`).join(' '),
);
check('The first exercise is the neck drill', today.exercises[0].id === 'nameNote');
check('The session counts its questions', today.questionCount === 30, String(today.questionCount));
// Thirty questions at about fourteen seconds each.
check('The session announces a length', today.minutes === 7, String(today.minutes));
check(
  'The same day gives the same session',
  dailySession(DEFAULT_PRACTICE, {}, 20260924).exercises[1].id === today.exercises[1].id,
);
check('One exercise of each terrain', rotationFor(0)[0] !== rotationFor(0)[1]);
check(
  'The rotation covers both lists',
  [0, 1, 2, 3, 4, 5].every((seed) => {
    const [a, b] = rotationFor(seed);
    return CHORDS_EAR.includes(a) && THEORY.includes(b);
  }),
  [0, 1, 2, 3, 4, 5].map((s) => rotationFor(s).join('+')).join(' '),
);
check(
  'Two days in a row do not give the same pair',
  [0, 1, 2, 3, 4].every((seed) => rotationFor(seed).join() !== rotationFor(seed + 1).join()),
);
// A narrow drill only has so many cells: the session asks what it can and says so
// with a smaller exercise rather than a block that never fills.
const smallDaily = dailySession(practiceFor(1), {}, 1);
check('A narrow drill asks only what it can', smallDaily.exercises[0].questions.length <= 10);

// ------------------------------------------------------------------ l'accueil

check('Monday opens on the session', homeSections(1, true)[0] === 'todaySession');
check('Wednesday opens on the session', homeSections(3, true)[0] === 'todaySession');
check('Thursday opens on the set', homeSections(4, true)[0] === 'sundaySet');
check('Saturday opens on the set', homeSections(6, true)[0] === 'sundaySet');
check('Sunday opens on the set', homeSections(0, true)[0] === 'sundaySet');
check('The session follows the set on Thursday', homeSections(4, true)[1] === 'todaySession');
check(
  'The last two cards never move',
  [0, 1, 2, 3, 4, 5, 6].every((day) => {
    const order = homeSections(day, true);
    return order[3] === 'progress' && order[4] === 'weeklyChallenge';
  }),
);
check('Every order has five cards', homeSections(2, true).length === 5);
check('No set sends the card last', homeSections(4, false)[2] === 'sundaySet', homeSections(4, false).join(','));
check('Sunday is the day you play', isSundayMode(0) && !isSundayMode(6));

// ------------------------------------------------------- la bibliothèque

const songA: Song = { ...emptySong('Gloire à Dieu', 7), updatedAt: '2026-09-01T00:00:00.000Z' };
const songB: Song = { ...emptySong('À toi la gloire', 0), updatedAt: '2026-09-20T00:00:00.000Z' };
const songC: Song = { ...emptySong('Noël', 2), updatedAt: '2026-09-10T00:00:00.000Z' };
const library: Song[] = [songA, songB, songC];

check('A search ignores accents', searchSongs(library, 'noel')[0].title === 'Noël');
check('A search ignores case', searchSongs(library, 'GLOIRE')[0].title === 'Gloire à Dieu');
check('A title that starts with the query comes first', searchSongs(library, 'gloire')[0].title === 'Gloire à Dieu');
check('A search finds what is inside a title', searchSongs(library, 'toi').length === 1);
check('A query is trimmed before it is matched', searchSongs(library, '  noel  ')[0].title === 'Noël');
check('A search with nothing typed lists the recent ones', searchSongs(library, '')[0].title === 'À toi la gloire');
check('A search can find nothing', searchSongs(library, 'zzz').length === 0);
check('A search is capped', searchSongs(library, '', 1).length === 1);
check(
  'The recent songs come newest first',
  recentSongs(library, 2).map((s) => s.title).join(',') === 'À toi la gloire,Noël',
);
check('The recent list is capped', recentSongs(library, 5).length === 3);
check('Folding keeps a plain title as it is', fold('Gloire à Dieu') === 'gloire a dieu');

const past: WorshipSet = { id: 'p', date: '2026-09-20', source: 'manual', songs: [] };
const soon: WorshipSet = { id: 'n', date: '2026-09-27', source: 'manual', songs: [] };
const later: WorshipSet = { id: 'l', date: '2026-10-04', source: 'manual', songs: [] };
check('The next set is the coming one', nextSet([past, later, soon], '2026-09-24')?.id === 'n');
check('A set dated today is still to come', nextSet([past, soon], '2026-09-27')?.id === 'n');
check('With nothing to come, the last one is shown', nextSet([past], '2026-09-24')?.id === 'p');
check('No sets at all is no set', nextSet([], '2026-09-24') === null);
check('A Sunday with no set needs songs', sundayNeedsSongs([], '2026-09-24', '2026-09-27'));
check(
  'A Sunday with a set of songs needs nothing',
  !sundayNeedsSongs([{ ...soon, songs: [{ songId: 'x', key: 7, capo: 0, order: 0 }] }], '2026-09-24', '2026-09-27'),
);

// ------------------------------------------------------------ le partage

const shareable: WorshipSet = {
  id: 'set-1',
  date: '2026-09-27',
  serviceName: 'Culte du soir',
  source: 'manual',
  songs: [
    { songId: songA.id, key: 7, capo: 2, order: 0 },
    { songId: songB.id, key: 2, capo: 0, order: 1 },
  ],
};
const withGrids: Song = {
  ...songA,
  sections: [{ name: 'verse', bars: ['1', '5', '6m', '4'] }],
  lyrics: 'Paroles secrètes',
};
const payload = shareSet(shareable, [withGrids, songB], 'Christelle');
check('A shared set keeps its date', payload.d === '2026-09-27');
check('A shared set keeps its service name', payload.n === 'Culte du soir');
check('A shared set names who sent it', payload.f === 'Christelle');
check('A shared set carries both songs', payload.songs.length === 2);
check('A shared song carries the key of the day', payload.songs[1].k === 2);
check('A shared song carries its capo', payload.songs[0].c === 2);
check(
  'A shared grid travels as Nashville numbers',
  payload.songs[0].s?.join('|') === 'verse:1 5 6m 4',
  payload.songs[0].s?.join('|'),
);
// The whole point of keeping lyrics in their own field: they must not be in the link.
check('A shared set never carries the lyrics', !JSON.stringify(payload).includes('Paroles secrètes'));
check('A shared song with no grid has no grid field', payload.songs[1].s === undefined);
check('A song the library lost is dropped from the set', shareSet(shareable, [songB]).songs.length === 1);
check('A set with no name and no sender has neither field', !('n' in shareSet(past, [songB])) && !('n' in shareSet(past, [songB], '  ')));

const link = shareLink(payload);
check('The link is prefixed with the app scheme', link.startsWith('graceguitar://import?d='), link.slice(0, 30));
check('The link holds nothing that needs escaping', /^[A-Za-z0-9\-_]+$/.test(link.slice(SHARE_PREFIX.length)));
const readBack = readSharedLink(link);
check('The link reads back', readBack !== null);
check('The link keeps the date', readBack?.d === '2026-09-27');
check('The link keeps the service name', readBack?.n === 'Culte du soir');
check('The link keeps who sent it', readBack?.f === 'Christelle');
check('The link keeps the songs', readBack?.songs.length === 2);
check('The link keeps the grid', readBack?.songs[0].s?.join('|') === 'verse:1 5 6m 4');
check('The link keeps the capo', readBack?.songs[0].c === 2);
check('Accents survive the round trip', readBack?.songs[0].t === 'Gloire à Dieu', readBack?.songs[0].t);
check('A truncated link reads as nothing', readSharedLink(link.slice(0, link.length - 12)) === null);
check('A link that is not a set reads as nothing', readSharedLink('https://example.com') === null);
check('A payload that is not JSON reads as nothing', readSharedPayload('pas-du-json') === null);
check('A set of zero songs is not a set', readSharedPayload(base64UrlEncode('{"v":1,"d":"2026-09-27","songs":[]}')) === null);
check(
  'A set with no date is not a set',
  readSharedPayload(base64UrlEncode('{"v":1,"songs":[{"t":"x","k":7,"m":"major","c":0}]}')) === null,
);
// A received set is written by someone else: a key out of range is clamped rather
// than trusted, because it would otherwise reach the transpose maths.
check(
  'An out-of-range key is brought back into twelve',
  readSharedPayload(
    base64UrlEncode('{"v":1,"d":"2026-09-27","songs":[{"t":"x","k":-1,"m":"nimporte","c":-4}]}'),
  )?.songs[0].k === 11,
);
check(
  'A missing mode falls back to major',
  readSharedPayload(base64UrlEncode('{"v":1,"d":"2026-09-27","songs":[{"t":"x","k":7,"m":"?"}]}'))?.songs[0].m ===
    'major',
);
// A shared set is small enough to scan: that is why the link is not compressed.
check('A two-song link stays scannable', link.length < 400, String(link.length));

let shareIds = 0;
const adopted = adoptShared(readBack!, [songB], 'shared', (prefix) => `${prefix}-${++shareIds}`);
check('A received set keeps the songs it can reuse', adopted.songs.length === 2);
check('A shared set becomes a local set', adopted.set.songs.length === 2);
check('A received set is marked as received', adopted.set.source === 'shared');
check('A received set keeps its date', adopted.set.date === '2026-09-27');
check('A received set is ordered as it arrived', adopted.set.songs.map((e) => e.order).join(',') === '0,1');
check(
  'A song already known is kept, not duplicated',
  adopted.songs.some((s) => s.id === songB.id),
);
check('The known song takes the incoming key', adopted.songs.find((s) => s.id === songB.id)?.defaultKey === 2);
check(
  'A new song arrives with its grid',
  adopted.songs.find((s) => s.title === 'Gloire à Dieu')?.sections?.[0].bars.join(' ') === '1 5 6m 4',
);
check('A received set names who sent it', adopted.set.serviceName === 'Culte du soir');

function report() {
  if (failures) {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('All theory checks passed');
}
