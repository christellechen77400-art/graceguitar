import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotePlayer } from '../audio/useNotePlayer';
import { Fretboard, Marker } from '../components/Fretboard';
import { Chip, ChipRow, PrimaryButton, SecondaryButton, useTextStyles } from '../components/ui';
import {
  Attempt,
  Question,
  questionMidi,
  rememberRun,
  retryMissed,
  runRecord,
  RunSummary,
  summarise,
} from '../practice/engine';
import { useHideTabBar } from '../navigation';
import { eventsOfRun, rememberEvents } from '../services/merge';
import { useSettings } from '../state/settings';
import { space, tabularNums, Theme, useStyles } from '../theme';
import { chordById, chordName } from '../theory/chords';
import { mod12, noteName, Notation, pcAt, prefersFlats, STANDARD_TUNING } from '../theory/notes';
import { DIATONIC } from '../theory/worship';

/**
 * One run of questions, from the first prompt to the score.
 *
 * It takes the questions rather than an exercise id, because three different
 * things start a run — an exercise from the catalogue, the five-minute session,
 * and a set to practise — and they should all behave the same way once they do.
 */
export function RunScreen({ questions, onExit }: { questions: Question[]; onExit: () => void }) {
  const { settings, notation, t, update } = useSettings();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { playNote, playStrum } = useNotePlayer();
  // Une séance occupe l'écran : la barre d'onglets s'efface pendant ce temps.
  useHideTabBar(true);
  const [run, setRun] = useState(() => ({ questions, attempts: [] as Attempt[], shownAt: Date.now() }));
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [transposed, setTransposed] = useState<number[]>([]);
  const playedRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const index = run.attempts.length;
  const question = run.questions[index];
  const flats = question && 'key' in question ? prefersFlats(question.key) : false;

  // A pending "next question" must not fire into an unmounted screen.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const sound = (q: Question) => {
    const midis = questionMidi(q);
    if (midis.length > 1) playStrum(midis);
    else if (midis.length === 1) playNote(midis[0]);
  };

  // Sound the question once, as it appears. Which ones are heard up front is a
  // choice: the ear exercises are nothing without it, and naming a note you have
  // not heard is guesswork. Find-the-note stays silent so it stays a search.
  const stamp = `${run.questions.length}:${index}`;
  useEffect(() => {
    if (!question || playedRef.current === stamp) return;
    playedRef.current = stamp;
    if (question.exercise === 'nameNote' || question.exercise === 'earQuality' || question.exercise === 'earDegree') {
      sound(question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, question]);

  const finish = (attempts: Attempt[], asked: Question[]) => {
    // Record what was practised, so the next session knows what to drill.
    let progress = settings.progress;
    asked.forEach((q, i) => {
      const a = attempts[i];
      // Only naming a note is tied to one position; the ear and capo questions
      // are about hearing, not about a place on the neck.
      if (!a || q.exercise !== 'nameNote') return;
      const key = `${q.string}:${q.fret}`;
      const prev = progress[key] ?? { attempts: 0, correct: 0, totalMs: 0 };
      progress = {
        ...progress,
        [key]: {
          attempts: prev.attempts + 1,
          correct: prev.correct + (a.correct ? 1 : 0),
          totalMs: prev.totalMs + a.ms,
        },
      };
    });
    const today = new Date().toISOString().slice(0, 10);
    const days = settings.practiceDays.includes(today)
      ? settings.practiceDays
      : [...settings.practiceDays, today];
    // Le compte-rendu de la séance, gardé pour les minutes de la semaine et le
    // meilleur temps du défi : rien d'autre ne retient une durée.
    const record = runRecord(asked, attempts, today);
    // Les réponses elles-mêmes, en plus du total : c'est ce qui permet de
    // reconstruire la progression sur un autre appareil. L'instant de la séance
    // donne leur identifiant, donc un envoi refait n'écrit pas deux fois.
    update({
      progress,
      practiceDays: days,
      runs: rememberRun(settings.runs, record),
      events: rememberEvents(settings.events, eventsOfRun(asked, attempts, new Date())),
    });
    setSummary(summarise(attempts));
  };

  const commit = (correct: boolean) => {
    const attempts = [...run.attempts, { correct, ms: Date.now() - run.shownAt }];
    setOutcome(correct);
    setRun((r) => ({ ...r, attempts }));
    // Let the answer be seen before the next question replaces it. A miss needs
    // longer than a hit: on the neck, the right position is worth a look.
    timerRef.current = setTimeout(
      () => {
        setOutcome(null);
        setAnswer(null);
        setFound([]);
        setTransposed([]);
        if (attempts.length >= run.questions.length) finish(attempts, run.questions);
        else setRun((r) => ({ ...r, shownAt: Date.now() }));
      },
      correct ? 550 : 1500,
    );
  };

  const answerBoard = (string: number, fret: number) => {
    if (!question) return;
    const pc = pcAt(string, fret);
    switch (question.exercise) {
      case 'findNote':
        commit(string === question.string && pc === question.pc);
        return;
      case 'chordTone':
        commit(pc === question.answer);
        return;
      case 'allOfNote': {
        if (pc !== question.pc) {
          commit(false);
          return;
        }
        const key = `${string}:${fret}`;
        if (found.includes(key)) return;
        const next = [...found, key];
        setFound(next);
        // The exercise ends when the neck has given up every one of them.
        if (next.length === question.targets.length) commit(true);
        return;
      }
      default:
        return;
    }
  };

  if (summary) {
    return (
      <SummaryView
        summary={summary}
        onRedo={() => {
          setSummary(null);
          setRun({ questions: retryMissed(run.questions, summary.missed), attempts: [], shownAt: Date.now() });
        }}
        onAgain={() => {
          setSummary(null);
          setRun({ questions: run.questions, attempts: [], shownAt: Date.now() });
        }}
        onExit={onExit}
      />
    );
  }

  if (!question) return null;
  const total = run.questions.length;
  const answered = outcome !== null;
  const confirmable =
    question.exercise === 'transpose' ? transposed.length === question.degrees.length : answer !== null;

  // Une séance occupe l'écran : la consigne et la réponse défilent, les deux
  // boutons restent au bas. Rien n'est jamais hors de portée du pouce.
  return (
    <View style={[s.run, { paddingBottom: insets.bottom + space.md }]}>
      <View style={s.runBar}>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel={t.practice.quit}
          style={s.quit}
        >
          <Text style={s.quitText}>✕</Text>
        </Pressable>
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${(index / total) * 100}%` }]} />
        </View>
        <Text style={s.counter}>{t.practice.progress(index + 1, total)}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={s.prompt}>{promptFor(question, t, notation, flats)}</Text>

        <AnswerArea
          question={question}
          notation={notation}
          flats={flats}
          answer={answer}
          found={found}
          transposed={transposed}
          onAnswer={setAnswer}
          onTransposed={setTransposed}
          onFret={answerBoard}
        />

        {answered && (
          <Text style={[s.feedback, outcome ? s.feedbackOk : s.feedbackBad]}>
            {outcome ? t.practice.correct : t.practice.wrong}
          </Text>
        )}
      </ScrollView>

      <View style={s.runFooter}>
        <SecondaryButton label={t.practice.listen} onPress={() => sound(question)} />
        {/* Playing questions answer themselves; the rest are graded on confirm. */}
        {needsConfirm(question) && (
          <PrimaryButton
            label={t.practice.next}
            disabled={!confirmable || answered}
            style={s.grow}
            onPress={() => {
              if (question.exercise === 'transpose') {
                commit(question.answers.every((a, i) => a === transposed[i]));
              } else if (answer !== null) {
                commit(answer === correctChoice(question));
              }
            }}
          />
        )}
      </View>
    </View>
  );
}

const needsConfirm = (q: Question) =>
  q.exercise === 'nameNote' ||
  q.exercise === 'capoExpress' ||
  q.exercise === 'transpose' ||
  q.exercise === 'earQuality' ||
  q.exercise === 'earDegree';

function correctChoice(q: Question): number {
  switch (q.exercise) {
    case 'nameNote':
      return q.answer;
    case 'capoExpress':
      return q.capo;
    case 'earQuality':
      return q.quality === 'maj' ? 0 : 1;
    case 'earDegree':
      return q.degree;
    default:
      return -1;
  }
}

function promptFor(
  q: Question,
  t: ReturnType<typeof useSettings>['t'],
  notation: Notation,
  flats: boolean,
): string {
  const n = (pc: number) => noteName(pc, notation, flats);
  switch (q.exercise) {
    case 'nameNote':
      return t.practice.prompt.nameNote;
    case 'findNote':
      return t.practice.prompt.findNote(n(q.pc), noteName(STANDARD_TUNING[q.string], notation, false));
    case 'allOfNote':
      return t.practice.prompt.allOfNote(n(q.pc));
    case 'chordTone':
      return t.practice.prompt.chordTone(
        t.practice.tone[q.tone],
        chordName(q.root, chordById(q.chord), notation, prefersFlats(q.root)),
      );
    case 'capoExpress':
      return t.practice.prompt.capoExpress(n(q.key));
    case 'transpose':
      return t.practice.prompt.transpose(
        q.degrees.map((d) => DIATONIC[d].nashville).join(' – '),
        n(q.key),
      );
    case 'earQuality':
      return t.practice.prompt.earQuality;
    case 'earDegree':
      return t.practice.prompt.earDegree;
  }
}

function AnswerArea(props: {
  question: Question;
  notation: Notation;
  flats: boolean;
  answer: number | null;
  found: string[];
  transposed: number[];
  onAnswer: (v: number) => void;
  onTransposed: (v: number[]) => void;
  onFret: (string: number, fret: number) => void;
}) {
  const { question: q, notation, flats } = props;
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const name = (pc: number) => noteName(pc, notation, flats);

  // Questions answered by playing a fret.
  if (q.exercise === 'findNote' || q.exercise === 'allOfNote' || q.exercise === 'chordTone') {
    // Only the positions already found are marked: dotting the ones still to find
    // would answer the question.
    const markers: Marker[] =
      q.exercise === 'allOfNote'
        ? props.found.map((key) => {
            const [string, fret] = key.split(':').map(Number);
            return { string, fret, kind: 'root' as const };
          })
        : [];
    return (
      <View style={s.block}>
        <Fretboard markers={markers} onPressCell={props.onFret} />
      </View>
    );
  }

  if (q.exercise === 'nameNote') {
    return (
      <View style={s.block}>
        <ChipRow>
          {q.choices.map((pc) => (
            <Chip key={pc} label={name(pc)} selected={props.answer === pc} onPress={() => props.onAnswer(pc)} />
          ))}
        </ChipRow>
      </View>
    );
  }

  if (q.exercise === 'capoExpress') {
    return (
      <View style={s.block}>
        <ChipRow>
          {Array.from({ length: 8 }, (_, n) => n).map((n) => (
            <Chip key={n} label={String(n)} selected={props.answer === n} onPress={() => props.onAnswer(n)} />
          ))}
        </ChipRow>
      </View>
    );
  }

  if (q.exercise === 'earQuality') {
    return (
      <View style={s.block}>
        <ChipRow>
          <Chip label={t.major} selected={props.answer === 0} onPress={() => props.onAnswer(0)} />
          <Chip label={t.minor} selected={props.answer === 1} onPress={() => props.onAnswer(1)} />
        </ChipRow>
      </View>
    );
  }

  if (q.exercise === 'earDegree') {
    // Only the degrees a cadence actually lands on, as the engine asks them.
    return (
      <View style={s.block}>
        <ChipRow>
          {[0, 5, 7, 9].map((degree) => (
            <Chip
              key={degree}
              label={DIATONIC.find((d) => d.degree === degree)!.nashville}
              selected={props.answer === degree}
              onPress={() => props.onAnswer(degree)}
            />
          ))}
        </ChipRow>
      </View>
    );
  }

  // Transposition: one row per chord of the progression, graded as a whole.
  return (
    <View>
      {q.degrees.map((degree, slot) => {
        const correct = q.answers[slot];
        const others = DIATONIC.map((d) => mod12(q.key + d.degree)).filter((pc) => pc !== correct);
        // Rotate the distractors per slot so the same three chords do not shadow
        // every question, then rotate the four together so the answer moves.
        const shift = (q.key + slot * 2) % others.length;
        const four = [correct, ...[...others.slice(shift), ...others.slice(0, shift)].slice(0, 3)];
        const turn = (q.key + slot) % 4;
        const options = [...four.slice(turn), ...four.slice(0, turn)];
        return (
          <ChipRow key={`${degree}-${slot}`}>
            <Text style={s.slot}>{DIATONIC[degree].nashville}</Text>
            {options.map((pc) => (
              <Chip
                key={pc}
                label={name(pc)}
                selected={props.transposed[slot] === pc}
                onPress={() => {
                  const next = [...props.transposed];
                  next[slot] = pc;
                  props.onTransposed(next);
                }}
              />
            ))}
          </ChipRow>
        );
      })}
    </View>
  );
}

function SummaryView({
  summary,
  onRedo,
  onAgain,
  onExit,
}: {
  summary: RunSummary;
  onRedo: () => void;
  onAgain: () => void;
  onExit: () => void;
}) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.run, { paddingBottom: insets.bottom + space.md }]}>
      <Text style={s.prompt}>{t.practice.score}</Text>
      <Text style={s.score}>
        {summary.correct} / {summary.total}
      </Text>
      <Text style={[ui.body, tabularNums]}>
        {t.practice.accuracy} {Math.round(summary.accuracy * 100)} % · {t.practice.meanTime}{' '}
        {(summary.meanMs / 1000).toFixed(1)} s
      </Text>
      <View style={s.runFooter}>
        {summary.missed.length > 0 && (
          <PrimaryButton label={t.practice.redoMissed} style={s.grow} onPress={onRedo} />
        )}
        <SecondaryButton label={t.practice.start} onPress={onAgain} />
        <SecondaryButton label={t.practice.done} onPress={onExit} />
      </View>
    </View>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    run: { flex: 1, backgroundColor: c.background },
    /** Ce qui défile entre la barre du haut et les boutons du bas. */
    body: { paddingBottom: space.xl },
    runBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md },
    quit: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
    quitText: { ...type.body, color: c.label },
    barTrack: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.fill,
      marginHorizontal: space.sm,
    },
    barFill: { height: 4, borderRadius: 2, backgroundColor: c.accent },
    counter: { ...type.caption, ...tabularNums, color: c.secondary, minWidth: 76, textAlign: 'right' },
    prompt: {
      ...type.section,
      color: c.label,
      paddingHorizontal: space.lg,
      marginTop: space.lg,
    },
    // The answer area stood in an untitled `Section`, whose only contribution was
    // its top margin: keep exactly that.
    block: { marginTop: space.lg },
    slot: { ...type.subhead, color: c.secondary, marginRight: space.sm, alignSelf: 'center', width: 32 },
    feedback: { ...type.headline, paddingHorizontal: space.lg, marginTop: space.md },
    // Right and wrong are told apart by the word, not by the colour: the palette
    // has one accent, and it means "action", never "well done".
    feedbackOk: { color: c.label },
    feedbackBad: { color: c.destructive },
    runFooter: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg },
    /** Le bouton qui prend la place : le principal des deux. */
    grow: { flex: 1 },
    score: {
      ...type.greeting,
      ...tabularNums,
      color: c.accent,
      paddingHorizontal: space.lg,
      marginTop: space.sm,
    },
  });
