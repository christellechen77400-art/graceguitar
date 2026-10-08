import { analyze } from '../src/theory/analyzer';
import { cagedShapeFor, getCagedShapes } from '../src/theory/caged';
import { chordById, parseChordSymbol, parseNoteName } from '../src/theory/chords';
import { inferKey, parseChordPro, progression, sectionBars } from '../src/songs/chordpro';
import { boardMarkers, isComplete, LESSON_BOARDS, LESSON_ORDER, scoreLesson } from '../src/theory/lessons';
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
  Attempt,
  cells,
  dailyRun,
  exerciseById,
  ExerciseId,
  DEFAULT_PRACTICE,
  heat,
  heatMarkers,
  HeatCell,
  makeQuestion,
  makeRun,
  mulberry32,
  neckTotals,
  prioritise,
  ProgressMap,
  Question,
  questionMidi,
  recordAttempt,
  rememberRun,
  retryMissed,
  RunRecord,
  RUN_HISTORY,
  runRecord,
  setChordRun,
  streak,
  summarise,
  voiceChord,
} from '../src/practice/engine';
import { levelFrom, MAX_SCORE, ONBOARDING, practiceFor } from '../src/practice/onboarding';
import { dailySession, rotationFor, CHORDS_EAR, DAILY_QUESTIONS, THEORY } from '../src/practice/daily';
import { homeSections, isSundayMode, SUNDAY_QUESTIONS } from '../src/home/order';
import { dayPart, greetingName, MAX_GREETING_NAME, seedOf, startOfWeek, weekDays, weekStrip } from '../src/home/day';
import { weekMinutes } from '../src/home/stats';
import { bestTime, challengeOfWeek, CHALLENGE_EXERCISES, CHALLENGE_QUESTIONS } from '../src/home/challenge';
import { notionOfDay, NOTIONS } from '../src/home/notion';
import {
  clampReminderHour,
  nextThursdayEvening,
  REMINDER_HOUR,
  REMINDER_HOUR_MAX,
  REMINDER_HOUR_MIN,
  shouldRemind,
  THURSDAY,
} from '../src/home/reminder';
import { originLabel, setSourceLabel, songLine } from '../src/songs/labels';
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
import { emptySong, nextSunday, nextSundays, setChords, setSongs, Song, SongSource, WorshipSet } from '../src/songs/model';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { formatDay, formatDayTitle, sectionLabel } from '../src/i18n';
import { exportJson, exportName, EXPORT_FORMAT } from '../src/state/export';
import { songFromChordPro } from '../src/songs/import';
import { migrateLibrary } from '../src/songs/migrate';
import { SET_SOURCES } from '../src/songs/sources';
import { migrateLegacyKeys, migrationPlan, STORAGE_KEYS } from '../src/state/storage';
import { CHUNK_SIZE, chunkCountKey, chunkKey, chunkValue, joinChunks } from '../src/services/chunk';
import { authErrorKey } from '../src/services/authErrors';
import {
  daysFromEvents,
  EVENT_HISTORY,
  eventsOfRun,
  foldEvents,
  mergeById,
  mergeLibrary,
  rebaseProgress,
  rememberEvents,
  unionDays,
  unionEvents,
} from '../src/services/merge';
import {
  eventRow,
  profileRow,
  rowToEvent,
  rowToSet,
  rowToSong,
  setRow,
  setSongRow,
  settingsFromProfile,
  songRow,
} from '../src/services/cloudRows';
import { isEmail, MIN_PASSWORD, passwordStrength } from '../src/services/password';
import { initialsOf } from '../src/services/account';
import { voicingTab, generateVoicings } from '../src/theory/voicings';
import { CAPO_SHAPES, capoOptions, DEFAULT_CAPO_SHAPES, probableChords, suggestCapo } from '../src/theory/worship';

import { allTips, tipOfDay, tipsByGroup, tipsForLayer } from '../src/content/tips';
import { guideSection, guideSections, helpLinks } from '../src/content/guide';
import { tipBoard, tipPairs } from '../src/content/tipBoards';
import { dictionaries } from '../src/i18n';
import { LAYERS, TABS } from '../src/navigation';
import { chainEntries, chordsOfSong, parseChordText, songFromChords, triadEntries } from '../src/songs/chordInput';
import { songChords } from '../src/songs/model';
import { addWidget, cleanWidgets, DEFAULT_WIDGETS, missingWidgets, moveWidget, removeWidget, visibleWidgets, WIDGET_IDS } from '../src/home/widgets';
import { pcAt } from '../src/theory/notes';
import {
  allInversions,
  bestChain,
  coverageGaps,
  movement,
  STRING_SET_IDS,
  TriadChord,
  triadOf,
  triadPitchClasses,
  triadTones,
  triadVoicings,
} from '../src/theory/triads';

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
check('The link is prefixed with the app scheme', link.startsWith('gccguitare://import?d='), link.slice(0, 30));
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

// ---------------------------------------------------------- l'accueil du jour

check('The morning starts at five', dayPart(5) === 'morning');
check('Eleven is still morning', dayPart(11) === 'morning');
check('Noon turns to afternoon', dayPart(12) === 'afternoon');
check('Half past five is still afternoon', dayPart(17) === 'afternoon');
check('Six in the evening is the evening', dayPart(18) === 'evening');
check('Two in the morning is still the evening', dayPart(2) === 'evening');
check('A greeting trims the name', greetingName('  Christelle  ') === 'Christelle');
check('A name of nothing is said alone', greetingName('   ') === '');
check(
  'A name of fourteen letters still fits',
  greetingName('A'.repeat(MAX_GREETING_NAME)) === 'A'.repeat(MAX_GREETING_NAME),
);
check('One letter more and it is left out', greetingName('A'.repeat(MAX_GREETING_NAME + 1)) === '');
check('The same text gives the same seed', seedOf('2026-09-24') === seedOf('2026-09-24'));
check('Another text gives another seed', seedOf('2026-09-24') !== seedOf('2026-09-25'));
check('A seed is a whole number, and positive', Number.isInteger(seedOf('x')) && seedOf('x') >= 0);

check('The week starts on Monday', startOfWeek('2026-09-24') === '2026-09-21', startOfWeek('2026-09-24'));
check('A Monday is its own week', startOfWeek('2026-09-21') === '2026-09-21');
check('A Sunday belongs to the week before', startOfWeek('2026-09-27') === '2026-09-21');
check('A week crosses the month', startOfWeek('2026-10-01') === '2026-09-28', startOfWeek('2026-10-01'));
check('A week has seven days', weekDays('2026-09-24').length === 7);
check(
  'The week runs Monday to Sunday',
  weekDays('2026-09-24')[0] === '2026-09-21' && weekDays('2026-09-24')[6] === '2026-09-27',
);
const strip = weekStrip(['2026-09-21', '2026-09-24'], '2026-09-24');
check('The strip marks the days practised', strip.filter((d) => d.done).length === 2);
check('The strip marks today once', strip.filter((d) => d.today).length === 1 && strip[3].today);
// A week cut off at today would not show that there is still room before Sunday.
check('The days to come are in the strip too', strip[6].iso === '2026-09-27' && !strip[6].done);
check('A strip with nothing practised is still a week', weekStrip([], '2026-09-24').length === 7);

const runAt = (day: string, totalMs: number, exercises: ExerciseId[] = ['nameNote']): RunRecord => ({
  day,
  exercises,
  questions: 10,
  correct: 8,
  totalMs,
});
const week: RunRecord[] = [
  runAt('2026-09-20', 600000), // dimanche : la semaine d'avant
  runAt('2026-09-21', 120000),
  runAt('2026-09-24', 180000),
  runAt('2026-09-25', 600000), // demain
];
check('The week counts from Monday', weekMinutes(week, '2026-09-24') === 5, String(weekMinutes(week, '2026-09-24')));
check('Nothing practised is no minute', weekMinutes([], '2026-09-24') === 0);
// A date in the future inside the history would be a bug elsewhere: counting it
// here would only hide it.
check('A run dated tomorrow is not counted', weekMinutes([runAt('2026-09-25', 600000)], '2026-09-24') === 0);

const challenge = challengeOfWeek('2026-09-24');
check('The challenge is one exercise', CHALLENGE_EXERCISES.includes(challenge.exercise));
check('The challenge is ten questions', challenge.questions === CHALLENGE_QUESTIONS);
check(
  'The challenge lasts the whole week',
  challengeOfWeek('2026-09-21').exercise === challengeOfWeek('2026-09-27').exercise,
);
check(
  'Another week brings another challenge',
  new Set(
    ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'].map(
      (monday) => challengeOfWeek(monday).exercise,
    ),
  ).size > 1,
);
// One question is not a time to beat, it is a time to read.
check(
  'An exercise of a single question is never the challenge',
  !CHALLENGE_EXERCISES.includes('allOfNote') && !CHALLENGE_EXERCISES.includes('chordTone'),
);

const fast = runAt('2026-09-26', 42000, [challenge.exercise]);
const slow = runAt('2026-09-27', 55000, [challenge.exercise]);
check('No run on the challenge is no time', bestTime([], challenge) === null);
check('The best time is the fastest', bestTime([slow, fast], challenge) === 42000, String(bestTime([slow, fast], challenge)));
check(
  'A session of several exercises does not count',
  bestTime([runAt('2026-09-26', 20000, ['nameNote', challenge.exercise])], challenge) === null,
);
check(
  'A session stopped short does not count',
  bestTime([{ ...fast, questions: CHALLENGE_QUESTIONS - 1 }], challenge) === null,
);
check('A run of another exercise does not count', bestTime([fast, runAt('2026-09-26', 1000, ['allOfNote'])], challenge) === 42000);

check('The notion of the day comes from the list', NOTIONS.includes(notionOfDay('2026-09-24')));
check('The same day gives the same notion', notionOfDay('2026-09-24').id === notionOfDay('2026-09-24').id);
check('A notion always opens a lesson', NOTIONS.every((n) => LESSON_ORDER.includes(n.lesson)));
// Drawn from the day, so a year of days goes through the whole list.
const year: string[] = [];
for (let i = 0; i < 366; i++) {
  const date = new Date('2026-01-01T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + i);
  year.push(date.toISOString().slice(0, 10));
}
check('Every notion has its day in the year', new Set(year.map(notionOfDay)).size === NOTIONS.length);
check('Every notion is written in French', NOTIONS.every((n) => fr.today.notions[n.id].hint.length > 40));
check('Every notion is written in English', NOTIONS.every((n) => en.today.notions[n.id].hint.length > 40));

check('Thursday with no songs reminds', shouldRemind(THURSDAY, false, true));
check('A set already filled does not remind', !shouldRemind(THURSDAY, true, true));
check('Another day does not remind', !shouldRemind(3, false, true) && !shouldRemind(5, false, true));
check('Reminders turned off do not remind', !shouldRemind(THURSDAY, false, false));
const tuesday = nextThursdayEvening(new Date('2026-09-22T09:00:00'));
check('The reminder falls on a Thursday', tuesday.getDay() === THURSDAY, String(tuesday.getDay()));
check(
  'The reminder is at seven in the evening',
  tuesday.getHours() === REMINDER_HOUR && tuesday.getMinutes() === 0,
);
check('It comes this week while Thursday is ahead', tuesday.getDate() === 24, String(tuesday.getDate()));
// Thursday evening, once seven has struck, is already the day it was meant for.
const thursdayNight = nextThursdayEvening(new Date('2026-09-24T20:00:00'));
check(
  'Once Thursday evening has passed it waits a week',
  thursdayNight.getDate() === 1 && thursdayNight.getMonth() === 9,
  String(thursdayNight),
);

const qFind = (pc: number): Question => ({ exercise: 'findNote', string: 0, pc });
const qCapo: Question = { exercise: 'capoExpress', key: 0, shapeKey: 0, capo: 0 };
const qAll: Question = { exercise: 'allOfNote', pc: 0, targets: [] };
const attempt = (correct: boolean, ms: number): Attempt => ({ correct, ms });
const questions: Question[] = [qFind(0), qCapo, qFind(4), qAll];
const attempts: Attempt[] = [attempt(true, 1000), attempt(false, 2000), attempt(true, 3000), attempt(true, 4000)];
const record = runRecord(questions, attempts, '2026-09-24');
check('A run keeps its day', record.day === '2026-09-24');
check('A run counts its questions', record.questions === 4);
check('A run counts what was right', record.correct === 3);
check('A run adds up its time', record.totalMs === 10000);
check('A run names each exercise once', record.exercises.join(',') === 'findNote,capoExpress,allOfNote', record.exercises.join(','));
// A session left in the middle counts what was answered, not what was planned.
const abandoned = runRecord(questions, attempts.slice(0, 2), '2026-09-24');
check('A question left unanswered is not counted', abandoned.questions === 2 && abandoned.totalMs === 3000);
check('Nor does it name its exercise', abandoned.exercises.join(',') === 'findNote,capoExpress');
check('A run of nothing is a run of nothing', runRecord([], [], '2026-09-24').exercises.length === 0);

let history: RunRecord[] = [];
for (let i = 0; i < RUN_HISTORY + 5; i++) history = rememberRun(history, runAt('2026-09-24', i));
check('The history is capped', history.length === RUN_HISTORY, String(history.length));
check('It is the oldest run that is forgotten', history[0].totalMs === 5, String(history[0].totalMs));
check('The newest run is kept', history[history.length - 1].totalMs === RUN_HISTORY + 4);
check('Adding a run leaves the others alone', rememberRun([], history[0])[0].totalMs === history[0].totalMs);

const progressMap: ProgressMap = {
  '0:3': { attempts: 4, correct: 4, totalMs: 4000 },
  '1:5': { attempts: 6, correct: 3, totalMs: 12000 },
  '2:0': { attempts: 0, correct: 0, totalMs: 0 },
};
const totals = neckTotals(progressMap);
check('The totals count the positions worked', totals.seen === 2, String(totals.seen));
check('The totals count every attempt', totals.attempts === 10);
check('The totals count every right answer', totals.correct === 7);
check('Accuracy is the share that was right', Math.round(totals.accuracy * 100) === 70);
check('The mean time is per note', totals.meanMs === 1600, String(totals.meanMs));
const noNeck = neckTotals({});
check(
  'Nothing practised leaves the figures at zero',
  noNeck.seen === 0 && noNeck.attempts === 0 && noNeck.accuracy === 0 && noNeck.meanMs === 0,
);

// Three levels that differ by outline as much as by shade, so that a reader who
// cannot tell the two fills apart still counts three shapes.
const heatCells: HeatCell[] = [
  { string: 0, fret: 3, rate: 1, attempts: 4 },
  { string: 0, fret: 5, rate: 0.8, attempts: 4 },
  { string: 0, fret: 7, rate: 0.5, attempts: 4 },
  { string: 1, fret: 0, rate: 0.4, attempts: 4 },
  { string: 1, fret: 3, rate: 0.25, attempts: 4 },
  { string: 2, fret: 7, rate: null, attempts: 0 },
];
const marks = heatMarkers(heatCells);
check('A known position is filled, with its rate', marks[0].kind === 'root' && marks[0].label === '100');
check('Eight in ten is already known', marks[1].kind === 'root' && marks[1].label === '80');
check('A half-known position is ringed', marks[2].kind === 'tone' && marks[2].ring === true && marks[2].label === '50');
check('Four in ten is already half known', marks[3].kind === 'tone' && marks[3].ring === true && marks[3].label === '40');
check('A weak position is a third shape', marks[4].kind === 'chord' && !marks[4].ring && marks[4].label === '25');
check('A position never played is a ghost, and says no number', marks[5].kind === 'ghost' && marks[5].label === undefined);
check('One marker per position, where it was played', marks.length === heatCells.length && marks.every((m, i) => m.string === heatCells[i].string && m.fret === heatCells[i].fret));

// Every C on the board, which is one per string and twice on the A and B
// strings: the neck shows more than an octave, so a note comes round again.
const cRoots = boardMarkers({ root: 0, chord: 'maj' })
  .filter((m) => m.kind === 'root')
  .map((m) => `${m.string}:${m.fret}`)
  .sort()
  .join(' ');
check('A chord board marks the root on every C of the neck', cRoots === '0:8 1:15 1:3 2:10 3:5 4:1 4:13 5:8', cRoots);
check(
  'A chord board names its chord tones',
  boardMarkers({ root: 0, chord: 'maj' })
    .filter((m) => m.kind === 'chord')
    .every((m) => typeof m.label === 'string' && m.label.length > 0),
);
check(
  'A chord board marks nothing but the chord',
  boardMarkers({ root: 0, chord: 'maj' }).every((m) => m.kind === 'root' || m.kind === 'chord'),
);
const scaleBoard = boardMarkers({ root: 0, scale: 'major' });
check('A scale board marks the root separately', scaleBoard.some((m) => m.kind === 'root'));
check(
  'A scale board covers the six other degrees once each',
  new Set(scaleBoard.filter((m) => m.kind === 'tone').map((m) => m.label)).size === 6,
);
check('A board asked for nothing marks nothing', boardMarkers({ root: 0 }).length === 0);

check('A day title opens with a capital', formatDayTitle('2026-09-27', fr) === 'Dimanche 27 septembre', formatDayTitle('2026-09-27', fr));
check('The English day title is capitalised too', formatDayTitle('2026-09-27', en) === 'Sunday 27 September');

check('A typed set says so', setSourceLabel({ ...soon }, fr) === fr.worship.origin.manual);
check('A set from GCC says so', setSourceLabel({ ...soon, source: 'gcc' }, fr) === fr.worship.origin.gcc);
check(
  'A received set names who sent it',
  setSourceLabel({ ...soon, source: 'shared', from: 'Christelle' }, fr) === 'Reçu de Christelle',
);
check(
  'A received set with no name stays generic',
  setSourceLabel({ ...soon, source: 'shared' }, fr) === fr.worship.origin.shared,
);
check(
  'A source we do not know reads as typed in',
  setSourceLabel({ ...soon, source: 'nimporte' as SongSource }, fr) === fr.worship.origin.manual,
);
// The source says `chordpro`, which is the format; the screen says what was done.
check('An import reads as imported', originLabel('chordpro', fr) === fr.worship.origin.imported);
check('A hand-typed song reads as typed in', originLabel('manual', fr) === fr.worship.origin.manual);
check('A song line gives the key', songLine(7, 0, 'anglo', fr) === `Tonalité G`);
check('A song line adds the capo when there is one', songLine(7, 2, 'anglo', fr) === 'Tonalité G · Capo 2');
check('A key of B flat is written with a flat', songLine(10, 0, 'anglo', fr).includes('B♭'));

// Sunday is played rather than worked: the same three exercises, in shorter form.
check('Sunday asks for fewer questions', SUNDAY_QUESTIONS < DAILY_QUESTIONS);
const sunday = dailySession(DEFAULT_PRACTICE, {}, 20260927, SUNDAY_QUESTIONS);
check('A Sunday session still has three exercises', sunday.exercises.length === 3);
check('A Sunday session is eighteen questions', sunday.questionCount === 18, String(sunday.questionCount));
check('Every Sunday exercise is shorter', sunday.exercises.every((e) => e.questions.length === SUNDAY_QUESTIONS));

// ------------------------------------------------------- mon espace, en local

// L'heure du rappel quotidien est bornée : en dehors, ce n'est plus un rappel.
check('A reminder hour too early is pulled up', clampReminderHour(2) === REMINDER_HOUR_MIN);
check('A reminder hour too late is pulled down', clampReminderHour(23) === REMINDER_HOUR_MAX);
check('A reminder hour in the day is left alone', clampReminderHour(8) === 8);
check('A reminder hour with minutes is rounded', clampReminderHour(7.6) === 8);
check('French hours read on the 24-hour clock', fr.hour(19) === '19 h' && fr.hour(7) === '7 h');
check('English hours read on the 12-hour clock', en.hour(19) === '7 PM' && en.hour(7) === '7 AM');
check('Midnight and noon read as twelve in English', en.hour(0) === '12 AM' && en.hour(12) === '12 PM');

// L'export : ce qu'on emporte doit se relire tout seul.
const exportedSong: Song = emptySong('Mon chant', 7);
const exportedSet: WorshipSet = { ...soon, songs: [{ songId: exportedSong.id, key: 7, capo: 2, order: 0 }] };
const exportedAt = new Date('2026-09-24T10:00:00.000Z');
const exported = exportJson(
  {
    firstName: 'Christelle',
    level: 2,
    goalMinutes: 10,
    hand: 'right',
    practice: DEFAULT_PRACTICE,
    progress: { '0:3': { attempts: 2, correct: 1, totalMs: 1500 } },
    practiceDays: ['2026-09-23'],
    runs: [],
    songs: [exportedSong],
    sets: [exportedSet],
  },
  exportedAt,
);
const carriedOver = JSON.parse(exported);
check('An export says which app wrote it', carriedOver.app === 'GCCGuitare');
check('An export carries its format number', carriedOver.format === EXPORT_FORMAT);
check('An export is stamped with the moment it was made', carriedOver.exportedAt === '2026-09-24T10:00:00.000Z');
check('An export carries the songs', carriedOver.songs.length === 1 && carriedOver.songs[0].title === 'Mon chant');
check('An export carries the sets with their songs', carriedOver.sets[0].songs[0].capo === 2);
check('An export carries the progress', carriedOver.progress['0:3'].correct === 1);
check('An export carries the settings it was made with', carriedOver.practice.questionCount === DEFAULT_PRACTICE.questionCount);
check('An export is written to be read by a person', exported.split('\n').length > 20);
check('The export file is named after the day', exportName(exportedAt) === 'gccguitare-2026-09-24.json');

// ---------------------------------------------------------------------------
// Le compte : ce qui voyage, ce qui se fusionne, et ce qui ne part jamais.
// ---------------------------------------------------------------------------

// La session dans le trousseau : SecureStore refuse au-delà de 2 048 octets.
const session = 'x'.repeat(4500);
const parts = chunkValue(session);
check('A long value is cut into pieces', parts.length === Math.ceil(4500 / CHUNK_SIZE), `${parts.length}`);
check('Every piece fits what the keychain accepts', parts.every((part) => part.length <= CHUNK_SIZE));
check('The pieces put the value back together', joinChunks(parts) === session);
check('The pieces are numbered under the same name', chunkKey('session', 2) === 'session.2' && chunkCountKey('session') === 'session.n');
check('A missing piece gives up rather than half a value', joinChunks(['a', null]) === null);
check('A value that was never written is not a value', joinChunks([]) === null);

// Les erreurs du serveur, traduites.
check('A wrong password is not a network problem', authErrorKey({ message: 'Invalid login credentials', status: 400 }) === 'badCredentials');
check('An address already taken says so', authErrorKey({ message: 'User already registered', status: 422 }) === 'inUse');
check('A short password says so', authErrorKey({ message: 'Password should be at least 8 characters', status: 422 }) === 'weakPassword');
check('Too many attempts says so', authErrorKey({ message: 'Too many requests', status: 429 }) === 'rateLimited');
check('A dead network says so', authErrorKey({ message: 'Network request failed' }) === 'offline');
check('An error nobody knows stays unknown', authErrorKey({ message: 'Boom', status: 500 }) === 'unknown');
check('No error at all is still an error we admit', authErrorKey(null) === 'offline');

// Les mots de passe : huit caractères, et un avis qui ne bloque rien.
check('Eight characters is the floor', MIN_PASSWORD === 8);
check('A short password is weak', passwordStrength('court') === 'weak');
check('Eight plain characters stay weak', passwordStrength('motdepasse') === 'weak');
check('A little variety is enough to be medium', passwordStrength('Motdepasse1') === 'medium');
check('Long and varied is strong', passwordStrength('Motdepasse1!x') === 'strong');
check('An address without an arobase is not one', !isEmail('christelle.example.com'));
check('An address without a domain is not one', !isEmail('christelle@'));
check('An ordinary address is one', isEmail(' christelle@example.com '));

// La fusion : le plus récent gagne, et rien ne disparaît.
const early = { id: 'a', updatedAt: '2026-09-01T00:00:00.000Z' };
const late = { id: 'a', updatedAt: '2026-09-02T00:00:00.000Z' };
const onlyRemote = { id: 'b', updatedAt: '2026-09-03T00:00:00.000Z' };
const onlyLocal = { id: 'c', updatedAt: '2026-09-01T00:00:00.000Z' };
const merged = mergeById([early, onlyLocal], [late, onlyRemote]);
check('The newest version of a row wins', merged[0] === late);
check('A row only the phone has is kept', merged.some((row) => row.id === 'c'));
check('A row only the account has arrives', merged.some((row) => row.id === 'b'));
check('The local order comes first', merged.map((row) => row.id).join('') === 'acb', merged.map((row) => row.id).join(''));
check('Two rows dated the same keep the phone version', mergeById([late], [{ ...late, tag: 'remote' } as typeof late])[0] === late);

// Une réponse enregistrée, et ce qu'on en fait.
const runMoment = new Date('2026-09-24T18:30:00.000Z');
const asked: Question[] = [
  { exercise: 'nameNote', string: 0, fret: 3, choices: [3, 5, 7, 9], answer: 3 },
  // L'oreille ne désigne aucune case : sa réponse ne doit pas entrer dans la carte.
  { exercise: 'earDegree', key: 7, degree: 4 },
  { exercise: 'nameNote', string: 1, fret: 2, choices: [0, 2, 4, 6], answer: 2 },
];
const tries: Attempt[] = [
  { correct: true, ms: 1200 },
  { correct: true, ms: 900 },
  { correct: false, ms: 2400 },
];
const journey = eventsOfRun(asked, tries, runMoment);
check('Only the questions about a position are written down', journey.length === 2, `${journey.length}`);
check('A response carries the place it was about', journey[0].string === 0 && journey[0].fret === 3);
check('A response says whether it was right', journey[0].correct && !journey[1].correct);
check('A response is stamped with the run', journey.every((event) => event.createdAt === '2026-09-24T18:30:00.000Z'));
const replay = eventsOfRun(asked, tries, runMoment);
check('Replaying the same run writes the same lines', replay.every((event, i) => event.id === journey[i].id));
check('Two runs a second apart do not collide', eventsOfRun(asked, tries, new Date(runMoment.getTime() + 1000))[0].id !== journey[0].id);
check('A response carries its time', journey[0].ms === 1200);
check('The journal forgets the oldest past its cap', rememberEvents([], Array.from({ length: EVENT_HISTORY + 10 }, () => journey[0]), EVENT_HISTORY).length === EVENT_HISTORY);

// Rejouer les réponses plutôt que d'additionner des totaux.
const folded = foldEvents(journey);
check('A right answer counts as one attempt', folded['0:3'].attempts === 1 && folded['0:3'].correct === 1);
check('A miss counts too', folded['1:2'].attempts === 1 && folded['1:2'].correct === 0);
check('A cell never played has no line', folded['2:0'] === undefined);
check('The same response twice counts once', foldEvents(unionEvents(journey, journey))['0:3'].attempts === 1);
check('A response from the account is folded in', foldEvents(unionEvents([], journey))['0:3'].correct === 1);

const remoteOnlyEvent = { ...journey[0], id: 'autre#0', correct: true };
check('Two runs the same day still count twice', foldEvents(unionEvents(journey, [remoteOnlyEvent]))['0:3'].attempts === 2);
check('A day of practice is read from the responses', daysFromEvents(journey).join() === '2026-09-24');
check('Days are gathered once each', daysFromEvents([...journey, ...journey]).length === 1);
check('The days of the phone and the account are gathered', unionDays(['2026-09-20'], daysFromEvents(journey)).join() === '2026-09-20,2026-09-24');

// La progression rejouée : ce qui a été travaillé avant le journal est gardé.
const before = { '5:3': { attempts: 4, correct: 2, totalMs: 5000 } };
const rebased = rebaseProgress({ ...before, '0:3': { attempts: 9, correct: 9, totalMs: 1 } }, journey, []);
check('A cell the journal knows is replayed, not added', rebased['0:3'].attempts === 1);
check('A cell the journal ignores keeps its history', rebased['5:3'].attempts === 4);
check('A cell only the account knows arrives', rebaseProgress({}, [], journey)['1:2'].attempts === 1);

// Ce qui monte et ce qui redescend : les colonnes du compte.
const cloudSong: Song = { ...emptySong('Mon chant', 7), updatedAt: '2026-09-24T10:00:00.000Z', lyrics: 'Des paroles' };
const songLine2 = songRow(cloudSong, 'u1');
check('A song row names its owner', songLine2.user_id === 'u1' && songLine2.id === cloudSong.id);
check('A song row carries its key and mode', songLine2.default_key === 7 && songLine2.mode === 'major');
check('A song row leaves the lyrics behind', !('lyrics' in songLine2));
check('A song row keeps the date that decides', songLine2.updated_at === '2026-09-24T10:00:00.000Z');
const cloudSongBack = rowToSong(songLine2, 'Des paroles');
check('A song comes back whole', cloudSongBack.title === 'Mon chant' && cloudSongBack.defaultKey === 7);
check('A song comes back with the lyrics of the phone', cloudSongBack.lyrics === 'Des paroles');
check('A song from an empty row has no sections', rowToSong(songLine2).sections === undefined);

const cloudSet: WorshipSet = {
  id: 'set-1',
  date: '2026-09-27',
  source: 'manual',
  updatedAt: '2026-09-24T10:00:00.000Z',
  songs: [
    { songId: cloudSong.id, key: 7, capo: 2, order: 0 },
    { songId: 'song-2', key: 0, capo: 0, order: 1 },
  ],
};
const setLine = setRow(cloudSet, 'u1', new Date('2026-09-24T12:00:00.000Z'));
check('A set row carries its date', setLine.service_date === '2026-09-27');
check('A set row carries the name of the service', setLine.service_name === null);
check('A set row is dated by its own change', setLine.updated_at === '2026-09-24T10:00:00.000Z');
check('A set with no name written yet is dated now', setRow({ ...cloudSet, updatedAt: undefined }, 'u1', new Date('2026-09-24T12:00:00.000Z')).updated_at === '2026-09-24T12:00:00.000Z');
const setLines = cloudSet.songs.map((entry) => setSongRow(cloudSet.id, entry));
check('A place in a set is named after the set and the song', setLines[0].id === `set-1:${cloudSong.id}`);
check('A place in a set keeps its rank', setLines[1].position === 1 && setLines[1].capo === 0);
const setBack = rowToSet(setLine, [setLines[1], setLines[0]]);
check('A set comes back in playing order', setBack.songs[0].songId === cloudSong.id);
check('A set comes back with its keys and capos', setBack.songs[0].capo === 2 && setBack.songs[1].key === 0);
check('A set with no name reads as unnamed', setBack.serviceName === undefined);

const eventLine = eventRow(journey[0], 'u1');
check('A response row names its owner and its place', eventLine.user_id === 'u1' && eventLine.string === 0 && eventLine.fret === 3);
check('A response row keeps the time it took', eventLine.response_ms === 1200);
check('A response comes back as it left', rowToEvent(eventLine).id === journey[0].id && rowToEvent(eventLine).correct === true);

const profileLine = profileRow(
  'u1',
  { firstName: 'Christelle', level: 2, lang: 'fr', notation: 'anglo', hand: 'right', preferredShapes: [7, 0], goalMinutes: 10, reminderHour: 19 },
  new Date('2026-09-24T10:00:00.000Z'),
);
check('A profile carries the first name', profileLine.first_name === 'Christelle');
check('A profile carries the level and the goal', profileLine.level === 2 && profileLine.daily_goal_minutes === 10);
const backProfile = settingsFromProfile(profileLine);
check('The profile gives the settings back', backProfile.firstName === 'Christelle' && backProfile.level === 2);
check('The profile carries the reminder hour', backProfile.reminderHour === 19);
check('The profile carries the shapes for the capo', backProfile.preferredShapes?.length === 2);
check('A level from elsewhere is not copied over', settingsFromProfile({ level: 9 }).level === undefined);
check('A language nobody speaks is ignored', settingsFromProfile({ locale: 'de' } as never).lang === undefined);
check('An empty profile changes nothing', Object.keys(settingsFromProfile({})).length === 0);

// La bibliothèque entière, dans les deux sens.
const cloudLibrary = mergeLibrary(
  { songs: [cloudSong], sets: [cloudSet] },
  { songs: [{ ...cloudSong, title: 'Mon chant', updatedAt: '2026-09-01T00:00:00.000Z' }], sets: [] },
);
check('The library keeps the newest song', cloudLibrary.songs.length === 1 && cloudLibrary.songs[0].title === 'Mon chant');
check('The library keeps the sets of the phone', cloudLibrary.sets.length === 1);
check('An account with nothing in it changes nothing', mergeLibrary({ songs: [cloudSong], sets: [] }, { songs: [], sets: [] }).songs.length === 1);

// L'accessibilité : ce qu'un lecteur d'écran annonce, et les deux lettres du compte.
check('A cell is announced with its string, its fret and its note', fr.a11y.cell('La', 3, 'Do') === 'Corde de La, case 3, Do', fr.a11y.cell('La', 3, 'Do'));
check('An open string is announced as open', fr.a11y.cell('Mi', 0, 'Mi').includes('à vide'));
check('A root is announced as the root', fr.a11y.cell('La', 3, 'Do', fr.a11y.roles.root).endsWith(', fondamentale'));
check('A chord tone is announced as one', fr.a11y.cell('La', 3, 'Do', fr.a11y.roles.chord).endsWith(', note de l’accord'));
check('The English cell says it the English way', en.a11y.cell('A', 3, 'C', en.a11y.roles.root) === 'A string, fret 3, C, root');
check('Every kind of marker has something to say', (['root', 'tone', 'chord', 'ghost'] as const).every((kind) => !!fr.a11y.roles[kind] && !!en.a11y.roles[kind]));

check('Initials come from the first name', initialsOf('Christelle', 'c@example.com') === 'CH');
check('Two first names give two initials', initialsOf('Marie Claire', 'mc@example.com') === 'MC');
check('With no first name, the address gives them', initialsOf('', 'christelle@example.com') === 'CH');
check('A dotted address gives them too', initialsOf('', 'marie.claire@example.com') === 'MC');
check('A single-letter address still gives something', initialsOf('', 'x@example.com') === 'X');

// ---------------------------------------------------------------------------
// GCCGuitare : triades dans une zone, saisie des accords, widgets, contenus.
// ---------------------------------------------------------------------------

const asTriad = (root: number, quality: 'maj' | 'min'): TriadChord => ({ root, quality });
const LA = asTriad(9, 'maj');
const FA_DIESE_M = asTriad(6, 'min');
const RE = asTriad(2, 'maj');
const MI = asTriad(4, 'maj');
const SOL = asTriad(7, 'maj');
const SI_M = asTriad(11, 'min');
const SI = asTriad(11, 'maj');
const DO_DIESE_M = asTriad(1, 'min');
const MI_M = asTriad(4, 'min');
const DO = asTriad(0, 'maj');

const framesOf = (chain: ReturnType<typeof bestChain>) => chain?.path.map((v) => v.frets.join(',')).join(' | ');

// Les quatre chants d'essai de docs/TESTS.md, zone 5 à 10, cordes sol-si-mi.
const gloire = bestChain([LA, FA_DIESE_M, RE, MI], 'sol-si-mi', 5, 10);
check(
  'Gloire à Dieu : La (6,5,5), Fa♯m (6,7,5), Ré (7,7,5), Mi (9,9,7)',
  framesOf(gloire) === '6,5,5 | 6,7,5 | 7,7,5 | 9,9,7',
  framesOf(gloire),
);
check('Gloire à Dieu : déplacement total 9', gloire?.total === 9, String(gloire?.total));
check(
  'Gloire à Dieu : 1er renversement, 2e, fondamentale, fondamentale',
  gloire?.path.map((v) => v.inversion).join('') === '1200',
);

const fidele = bestChain([RE, SOL, LA, SI_M], 'sol-si-mi', 5, 10);
check('Tu es fidèle : Ré (7,7,5) Sol (7,8,7) La (6,5,5) Si m (7,7,7)', framesOf(fidele) === '7,7,5 | 7,8,7 | 6,5,5 | 7,7,7', framesOf(fidele));
check('Tu es fidèle : déplacement total 14', fidele?.total === 14, String(fidele?.total));

const force = bestChain([MI, LA, SI, DO_DIESE_M], 'sol-si-mi', 5, 10);
check('Ma force : Mi (9,9,7) La (9,10,9) Si (8,7,7) Do♯m (9,9,9)', framesOf(force) === '9,9,7 | 9,10,9 | 8,7,7 | 9,9,9', framesOf(force));
check('Ma force : déplacement total 14', force?.total === 14, String(force?.total));

const beni = bestChain([SOL, RE, MI_M, DO], 'sol-si-mi', 5, 10);
check('Béni soit ton nom : Sol (7,8,7) Ré (7,7,5) Mi m (9,8,7) Do (9,8,8)', framesOf(beni) === '7,8,7 | 7,7,5 | 9,8,7 | 9,8,8', framesOf(beni));
check('Béni soit ton nom : déplacement total 9', beni?.total === 9, String(beni?.total));

// Chaque forme proposée contient bien tonique, tierce et quinte, dans la zone, en 2 cases au plus.
const everyShapeIsSound = [
  { chords: [LA, FA_DIESE_M, RE, MI], chain: gloire },
  { chords: [RE, SOL, LA, SI_M], chain: fidele },
  { chords: [MI, LA, SI, DO_DIESE_M], chain: force },
  { chords: [SOL, RE, MI_M, DO], chain: beni },
].every(({ chords, chain }) =>
  chain !== null &&
  chain.path.every((v, i) => {
    const pcs = triadPitchClasses('sol-si-mi', v.frets);
    const tones = triadTones(chords[i]);
    return (
      new Set(pcs).size === 3 &&
      pcs.every((pc) => tones.includes(pc)) &&
      Math.min(...v.frets) >= 5 &&
      Math.max(...v.frets) <= 10 &&
      Math.max(...v.frets) - Math.min(...v.frets) <= 2
    );
  }),
);
check('Toute forme proposée est une vraie triade, dans la zone, en 2 cases au plus', everyShapeIsSound);

// Toute fenêtre de 6 cases (z de 1 à 9) contient une triade majeure ou mineure sur sol-si-mi et ré-sol-si.
let windowsOk = true;
for (const set of ['sol-si-mi', 're-sol-si'] as const) {
  for (let root = 0; root < 12; root++) {
    for (const quality of ['maj', 'min'] as const) {
      for (let z = 1; z <= 9; z++) {
        if (!triadVoicings({ root, quality }, set, z, z + 5).length) windowsOk = false;
      }
    }
  }
}
check('12 racines, majeur et mineur, toute fenêtre de 6 cases : une triade sur sol-si-mi et ré-sol-si', windowsOk);
check(
  'Sur la-ré-sol, une fenêtre étroite manque parfois une triade (et l’app le dit)',
  coverageGaps([LA, FA_DIESE_M, RE, MI], 'la-re-sol', 5, 7).length > 0 || coverageGaps([asTriad(1, 'maj'), asTriad(3, 'min')], 'la-re-sol', 1, 6).length > 0,
);
check('Une zone sans forme rend null au lieu de deviner', bestChain([asTriad(1, 'maj'), asTriad(3, 'min')], 'la-re-sol', 1, 3) === null || coverageGaps([asTriad(1, 'maj'), asTriad(3, 'min')], 'la-re-sol', 1, 3).length === 0);
check('Pas d’accord, pas de déplacement', bestChain([], 'sol-si-mi', 5, 10)?.total === 0);
check('Un seul accord ne bouge pas', bestChain([LA], 'sol-si-mi', 5, 10)?.total === 0);

// Imposer une autre forme pour La recalcule les autres accords autour d'elle.
const laForms = triadVoicings(LA, 'sol-si-mi', 5, 10);
const otherLa = laForms.find((v) => v.frets.join(',') !== '6,5,5');
const pinned = otherLa ? bestChain([LA, FA_DIESE_M, RE, MI], 'sol-si-mi', 5, 10, { 0: otherLa }) : null;
check('La a deux formes dans la zone 5 à 10', laForms.length === 2, String(laForms.length));
check('Choisir l’autre forme de La la garde en tête de l’enchaînement', !!pinned && pinned.path[0].frets.join(',') === otherLa?.frets.join(','));
check('Les autres accords sont gardés dans la zone autour de la forme choisie', !!pinned && pinned.path.every((v) => Math.min(...v.frets) >= 5 && Math.max(...v.frets) <= 10));
check('Aucun enchaînement imposé ne bouge moins que le meilleur', !!pinned && !!gloire && pinned.total >= gloire.total);

// Toutes les inversions. Sur sol-si-mi et ré-sol-si, les trois renversements existent pour tous
// les accords. Sur la-ré-sol, avec 2 cases d'écart au plus, la fondamentale manque souvent : la
// liste ne montre que ce qui se joue.
let inversionsOk = true;
let laReSolHasForms = true;
let laReSolIncomplete = false;
for (let root = 0; root < 12; root++) {
  for (const quality of ['maj', 'min'] as const) {
    for (const set of ['sol-si-mi', 're-sol-si'] as const) {
      if (new Set(allInversions({ root, quality }, set).map((v) => v.inversion)).size !== 3) inversionsOk = false;
    }
    const low = allInversions({ root, quality }, 'la-re-sol');
    if (!low.length) laReSolHasForms = false;
    if (new Set(low.map((v) => v.inversion)).size < 3) laReSolIncomplete = true;
  }
}
check('Chaque accord a ses trois renversements sur sol-si-mi et ré-sol-si', inversionsOk);
check('Sur la-ré-sol, chaque accord a au moins une forme, mais pas toujours les trois renversements', laReSolHasForms && laReSolIncomplete);
const laInversions = allInversions(LA, 'sol-si-mi');
check('La liste des inversions classe fondamentale, 1er, 2e', laInversions.map((v) => v.inversion).join('') === [...laInversions.map((v) => v.inversion)].sort().join(''));

// Les phrases de mouvement.
const move = movement({ frets: [7, 7, 5], inversion: 0 }, { frets: [7, 9, 5], inversion: 1 });
check('Une seule corde qui bouge se dit', move.moved === 1 && move.deltas[1] === 2);
check('Rien ne bouge : zéro corde', movement(laInversions[0], laInversions[0]).moved === 0);

// Les accords enrichis se jouent avec la triade de leur base, les autres sont laissés de côté.
check('Un accord de septième se joue avec sa triade', triadOf('dom7')?.quality === 'maj' && triadOf('dom7')?.simplified === true);
check('Un mineur septième se joue avec sa triade mineure', triadOf('min7')?.quality === 'min');
check('Un sus4 est ramené au majeur, et le dit', triadOf('sus4')?.simplified === true);
check('Un diminué n’a pas de triade majeure ou mineure', triadOf('dim') === null && triadOf('aug') === null);
check('Un majeur simple n’est pas « simplifié »', triadOf('maj')?.simplified === false);

// Les tips sont vrais : ce que dit chaque schéma se vérifie sur le manche.
const octaveOk = tipPairs('tip-01').every(([[s1, f1], [s2, f2]]) => pcAt(s1, f1) === pcAt(s2, f2) && s2 === s1 + 2);
check('Tip octave : les paires donnent la même note, deux cordes plus haut', octaveOk);
let octaveRule = true;
for (let string = 0; string <= 3; string++) {
  for (let fret = 0; fret <= 12; fret++) {
    const arrivesOnBorE = string + 2 >= 4;
    const to = fret + (arrivesOnBorE ? 3 : 2);
    if (pcAt(string, fret) !== pcAt(string + 2, to)) octaveRule = false;
  }
}
check('Tip octave, règle complète : +2 cases, +3 en arrivant sur si ou mi aigu', octaveRule);
check('Tip corde voisine : les paires donnent la même note', tipPairs('tip-02').every(([[s1, f1], [s2, f2]]) => pcAt(s1, f1) === pcAt(s2, f2)));
const [fourthPair] = tipPairs('tip-04');
check(
  'Tip quarte puis quinte : même case = quarte, deux cases de plus = quinte',
  (pcAt(fourthPair[1][0], fourthPair[1][1]) - pcAt(fourthPair[0][0], fourthPair[0][1]) + 12) % 12 === 5 &&
    (pcAt(fourthPair[2][0], fourthPair[2][1]) - pcAt(fourthPair[0][0], fourthPair[0][1]) + 12) % 12 === 7,
);
const gShapes = triadVoicings({ root: 7, quality: 'maj' }, 'sol-si-mi', 0, 15);
check('Tip renversements : sol majeur, 1er case 4, 2e case 7, fondamentale case 12', 
  gShapes.some((v) => v.inversion === 1 && v.frets.join() === '4,3,3') &&
  gShapes.some((v) => v.inversion === 2 && v.frets.join() === '7,8,7') &&
  gShapes.some((v) => v.inversion === 0 && v.frets.join() === '12,12,10'));
check('Les schémas des tips ont tous des cases', ['tip-01', 'tip-02', 'tip-04', 'tip-09'].every((id) => tipBoard(id, 'anglo').length > 0));

// Les contenus : 13 tips dans les deux langues, un guide qui tient ses promesses.
const tipsFrAll = allTips('fr');
const tipsEnAll = allTips('en');
check('Treize tips en français', tipsFrAll.length === 13);
check('Les mêmes treize tips en anglais', tipsEnAll.length === 13 && tipsEnAll.every((tip, i) => tip.id === tipsFrAll[i].id));
check('Aucun tip sans titre, texte, exemple ni mémo', [...tipsFrAll, ...tipsEnAll].every((tip) => tip.title && tip.text && tip.example && tip.memo));
check('Chaque couche a au moins un tip, sauf peut-être aucune', LAYERS.every((layer) => tipsForLayer('fr', layer).length > 0));
check('Le tip du jour ne change pas dans la journée', tipOfDay('fr', '2026-10-08').id === tipOfDay('fr', '2026-10-08').id);
check('Les tips sont groupés', tipsByGroup('fr').reduce((n, g) => n + g.tips.length, 0) === 13);
for (const lang of ['fr', 'en'] as const) {
  const sections = guideSections(lang);
  check(`Guide ${lang} : chaque lien d’aide mène à une section qui existe`, helpLinks(lang).every((link) => !!guideSection(lang, link.target)));
  check(`Guide ${lang} : chaque section a un titre et du texte`, sections.every((section) => section.title && section.body.length > 0));
}
check('Guide : mêmes sections dans les deux langues', guideSections('fr').map((s) => s.id).join() === guideSections('en').map((s) => s.id).join());
check('Les liens d’aide sont les mêmes dans les deux langues', helpLinks('fr').map((l) => `${l.screen}>${l.target}`).join() === helpLinks('en').map((l) => `${l.screen}>${l.target}`).join());
check('Chaque couche a ses quatre textes « Comprendre » en français et en anglais', LAYERS.every((layer) => {
  const fr = dictionaries.fr.understand.layers[layer];
  const en = dictionaries.en.understand.layers[layer];
  return [fr.short, fr.onNeck, fr.byEar, fr.remember, en.short, en.onNeck, en.byEar, en.remember].every(Boolean);
}));
check('Le nom de l’app est GCCGuitare', dictionaries.fr.appName === 'GCCGuitare' && dictionaries.en.appName === 'GCCGuitare');
check('Quatre onglets', TABS.length === 4 && TABS.join() === 'home,neck,sunday,me');
check('Les onglets ont un nom dans les deux langues', TABS.every((id) => !!dictionaries.fr.tabs[id] && !!dictionaries.en.tabs[id]));

// La saisie.
const typed = parseChordText('La Fa♯m Ré Mi');
check('« La Fa♯m Ré Mi » se lit en quatre accords', typed.chords.length === 4 && typed.unreadable.length === 0);
check('… La, Fa♯m, Ré, Mi', typed.chords.map((c) => `${c.root}${c.chord}`).join() === '9maj,6min,2maj,4maj');
check('« A F#m D E » donne les mêmes accords', parseChordText('A F#m D E').chords.map((c) => `${c.root}${c.chord}`).join() === typed.chords.map((c) => `${c.root}${c.chord}`).join());
check('« Si m » avec une espace se lit comme « Sim »', parseChordText('Ré Sol La Si m').chords[3]?.root === 11 && parseChordText('Ré Sol La Si m').chords[3]?.chord === 'min');
check('« Do♯ m » aussi', parseChordText('Mi La Si Do♯ m').chords[3]?.chord === 'min' && parseChordText('Mi La Si Do♯ m').chords[3]?.root === 1);
check('Les virgules et les barres séparent', parseChordText('G, D | Em, C').chords.length === 4);
check('Une grille ChordPro se lit par ses crochets', parseChordText('[G]Amazing [D]grace [Em]how [C]sweet').chords.length === 4);
check('Ce qui n’est pas un accord est rendu à part', parseChordText('G truc D').unreadable.join() === 'truc' && parseChordText('G truc D').chords.length === 2);
check('Une répétition « x2 » ne fait pas d’erreur', parseChordText('G D x2').unreadable.length === 0);
check('Un accord de septième se lit', parseChordText('D7 Em7').chords.map((c) => c.chord).join() === 'dom7,min7');
check('Un renversement garde sa tonique', parseChordText('D/F#').chords[0]?.root === 2);
check('Un texte vide ne donne rien', parseChordText('   ').chords.length === 0);

const entries = triadEntries(parseChordText('La La Fa♯m dim Ré').chords.concat(parseChordText('Sol°').chords));
check('Le même accord deux fois de suite ne compte qu’une fois dans l’enchaînement', chainEntries(entries).length === 3, String(chainEntries(entries).length));
check('Un accord sans triade reste dans la saisie mais pas dans l’enchaînement', entries.some((e) => e.triad === null) && chainEntries(entries).every((e) => e.triad !== null));

const enteredSong = songFromChords('Gloire à Dieu', 9, parseChordText('La Fa♯m Ré Mi').chords);
check('Un chant saisi garde ses accords en chiffrage', enteredSong.sections?.[0].bars.join(' ') === '1 6m 4 5', enteredSong.sections?.[0].bars.join(' '));
check('… et les retrouve dans sa tonalité', chordsOfSong(enteredSong).map((c) => `${c.root}${c.chord}`).join() === '9maj,6min,2maj,4maj');
check('Transposé dans une autre tonalité, il suit', songChords(enteredSong, 2).map((c) => c.root).join() === '2,11,7,9');

// Les widgets de l'Accueil.
check('Sans réglage, quatre widgets', cleanWidgets(undefined).join() === DEFAULT_WIDGETS.join() && DEFAULT_WIDGETS.length === 4);
check('Sans set, pas de « Prochain dimanche »', !visibleWidgets(DEFAULT_WIDGETS, false).includes('sunday'));
check('Avec un set, il apparaît', visibleWidgets(DEFAULT_WIDGETS, true).includes('sunday'));
check('Une liste enregistrée perd ses inconnus et ses doublons', cleanWidgets(['tip', 'zzz', 'tip', 'session']).join() === 'tip,session');
check('Une liste vide reste vide : c’est un choix', cleanWidgets([]).length === 0);
check('Monter un widget le place avant', moveWidget(['session', 'progress'], 'progress', -1).join() === 'progress,session');
check('Descendre le dernier ne bouge rien', moveWidget(['session', 'progress'], 'progress', 1).join() === 'session,progress');
check('Retirer un widget', removeWidget(['session', 'progress'], 'session').join() === 'progress');
check('Ajouter un widget deux fois ne le double pas', addWidget(addWidget(['session'], 'tip'), 'tip').join() === 'session,tip');
check('On propose ce qui manque', missingWidgets(['session']).length === WIDGET_IDS.length - 1);

function report() {
  if (failures) {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('All theory checks passed');
}
