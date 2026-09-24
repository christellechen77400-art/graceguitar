import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker, MarkerKind } from '../components/Fretboard';
import {
  Chip,
  ChipRow,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  useTextStyles,
} from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { chordById, chordPcs, chordToneLabel } from '../theory/chords';
import { LessonContent, LessonId, LESSON_BOARDS, LESSON_ORDER, scoreLesson } from '../theory/lessons';
import { lessonsEn } from '../theory/lessons.en';
import { lessonsFr } from '../theory/lessons.fr';
import { FRET_COUNT, INTERVAL_LABELS, mod12, noteName, pcAt, prefersFlats, STRING_COUNT } from '../theory/notes';
import { scaleById } from '../theory/scales';

/**
 * The theory course: a list, then one lesson at a time.
 *
 * Reading and answering are one screen rather than two, because the fretboard is
 * what the text is about and the questions are about the fretboard.
 */
export function LessonsPanel() {
  const { settings, t } = useSettings();
  const s = useStyles(makeStyles);
  const [open, setOpen] = useState<LessonId | null>(null);
  const lessons = settings.lang === 'en' ? lessonsEn : lessonsFr;

  if (open) {
    return <LessonView id={open} content={lessons[open]} onExit={() => setOpen(null)} />;
  }

  return (
    <View>
      <Text style={s.title}>{t.theory.title}</Text>
      <View style={s.section}>
        {LESSON_ORDER.map((id, i) => (
          <Pressable key={id} onPress={() => setOpen(id)} accessibilityRole="button" style={s.row}>
            <Text style={s.index}>{i + 1}</Text>
            <Text style={s.rowLabel}>{lessons[id].title}</Text>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LessonView({
  id,
  content,
  onExit,
}: {
  id: LessonId;
  content: LessonContent;
  onExit: () => void;
}) {
  const { settings, notation, t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [answers, setAnswers] = useState<(number | null)[]>(() => content.questions.map(() => null));
  const [reading, setReading] = useState(true);
  const board = LESSON_BOARDS[id];
  const flats = prefersFlats(board.root);
  const total = LESSON_ORDER.length;
  const position = LESSON_ORDER.indexOf(id) + 1;

  const markers = useMemo(() => {
    const out: Marker[] = [];
    const chord = board.chord ? chordById(board.chord) : null;
    const pcs = board.scale
      ? scaleById(board.scale).intervals.map((i) => mod12(board.root + i))
      : chord
        ? chordPcs(board.root, chord)
        : [];
    if (!pcs.length) return out;
    // Every position of the root gets a dot: on a lesson about where a note lives,
    // one dot would be a lie.
    for (let string = 0; string < STRING_COUNT; string++) {
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const pc = pcAt(string, fret);
        if (!pcs.includes(pc)) continue;
        const offset = mod12(pc - board.root);
        const kind: MarkerKind = pc === board.root ? 'root' : chord ? 'chord' : 'tone';
        const label =
          pc === board.root ? undefined : chord ? chordToneLabel(chord, board.root, pc) : INTERVAL_LABELS[offset];
        out.push({ string, fret, kind, label });
      }
    }
    return out;
  }, [board, settings.display]);

  const right = scoreLesson(content, answers);
  const answeredAll = answers.every((a) => a !== null);

  return (
    <View style={s.lesson}>
      <View style={s.lessonBar}>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel={t.close}
          style={s.quit}
        >
          <Text style={s.quitText}>✕</Text>
        </Pressable>
        <Text style={s.lessonOf}>{t.theory.lessonOf(position, total)}</Text>
      </View>

      <Text style={s.lessonTitle}>{content.title}</Text>

      {reading ? (
        <View>
          {content.body.map((paragraph, i) => (
            <Text key={i} style={s.body}>
              {paragraph}
            </Text>
          ))}
          <View style={s.section}>
            <Fretboard markers={markers} focusFret={board.focusFret} />
          </View>
          <View style={s.footer}>
            <PrimaryButton label={t.theory.read} onPress={() => setReading(false)} />
          </View>
        </View>
      ) : (
        <View>
          <View style={s.section}>
            <Fretboard markers={markers} focusFret={board.focusFret} />
          </View>

          {content.questions.map((question, qi) => {
            const chosen = answers[qi];
            return (
              <View key={qi}>
                <SectionHeader>{t.theory.questionOf(qi + 1, content.questions.length)}</SectionHeader>
                <Text style={s.question}>{question.prompt}</Text>
                <ChipRow>
                  {question.choices.map((choice, ci) => {
                    const isAnswer = ci === question.answer;
                    // Once answered, the right choice is marked by a tick, not by
                    // colour: a green chip says nothing to a colour-blind reader.
                    const mark = chosen === null ? '' : isAnswer ? ' ✓' : chosen === ci ? ' ✕' : '';
                    return (
                      <Chip
                        key={ci}
                        label={choice + mark}
                        selected={chosen === ci}
                        onPress={() => {
                          // The answer locks in: a course you can re-answer is a
                          // course you can pass by trying.
                          if (chosen !== null) return;
                          const next = [...answers];
                          next[qi] = ci;
                          setAnswers(next);
                        }}
                      />
                    );
                  })}
                </ChipRow>
                {chosen !== null && <Text style={ui.hint}>{question.explain}</Text>}
              </View>
            );
          })}

          <View style={s.footer}>
            {answeredAll ? (
              <>
                <Text style={s.score}>
                  {t.theory.done} · {t.theory.score(right, content.questions.length)}
                </Text>
                <PrimaryButton label={t.theory.done} onPress={onExit} />
              </>
            ) : (
              <Text style={ui.hint}>{t.theory.doneHint}</Text>
            )}
            <SecondaryButton
              label={t.theory.restart}
              onPress={() => {
                setAnswers(content.questions.map(() => null));
                setReading(true);
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = ({ c, type, space, size }: Theme) =>
  StyleSheet.create({
    title: { ...type.cardTitle, color: c.label, paddingHorizontal: space.lg, marginTop: space.md },
    /** Le bloc d'une section sans titre : la même respiration qu'un `SectionHeader`. */
    section: { marginTop: space.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: size.row,
      paddingHorizontal: space.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    index: { ...type.caption, color: c.secondary, width: 24 },
    rowLabel: { ...type.body, color: c.label, flex: 1 },
    chevron: { ...type.section, color: c.secondary },
    lesson: { paddingBottom: space.xl },
    lessonBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm },
    quit: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
    quitText: { ...type.section, color: c.label },
    lessonOf: { ...type.caption, color: c.secondary, marginLeft: space.sm },
    lessonTitle: { ...type.section, color: c.label, paddingHorizontal: space.lg, marginTop: space.sm },
    body: {
      ...type.subhead,
      color: c.label,
      lineHeight: 22,
      paddingHorizontal: space.lg,
      marginTop: space.md,
    },
    question: { ...type.headline, color: c.label, paddingHorizontal: space.lg, marginBottom: space.sm },
    footer: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.md },
    score: { ...type.headline, color: c.accent },
  });
