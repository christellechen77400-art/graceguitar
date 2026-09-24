import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker, MarkerKind } from '../components/Fretboard';
import { Chip, ChipRow, Section, styles as ui } from '../components/ui';
import { useSettings } from '../state/settings';
import { colors, fonts, space } from '../theme';
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
  const [open, setOpen] = useState<LessonId | null>(null);
  const lessons = settings.lang === 'en' ? lessonsEn : lessonsFr;

  if (open) {
    return <LessonView id={open} content={lessons[open]} onExit={() => setOpen(null)} />;
  }

  return (
    <View>
      <Text style={s.title}>{t.theory.title}</Text>
      <Section>
        {LESSON_ORDER.map((id, i) => (
          <Pressable key={id} onPress={() => setOpen(id)} accessibilityRole="button" style={s.row}>
            <Text style={s.index}>{i + 1}</Text>
            <Text style={s.rowLabel}>{lessons[id].title}</Text>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))}
      </Section>
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
          <Section>
            <Fretboard markers={markers} focusFret={board.focusFret} />
          </Section>
          <View style={s.footer}>
            <Pressable onPress={() => setReading(false)} accessibilityRole="button" style={s.primary}>
              <Text style={s.primaryText}>{t.theory.read}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <Section>
            <Fretboard markers={markers} focusFret={board.focusFret} />
          </Section>

          {content.questions.map((question, qi) => {
            const chosen = answers[qi];
            return (
              <Section key={qi} title={t.theory.questionOf(qi + 1, content.questions.length)}>
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
              </Section>
            );
          })}

          <View style={s.footer}>
            {answeredAll ? (
              <>
                <Text style={s.score}>
                  {t.theory.done} · {t.theory.score(right, content.questions.length)}
                </Text>
                <Pressable onPress={onExit} accessibilityRole="button" style={s.primary}>
                  <Text style={s.primaryText}>{t.theory.done}</Text>
                </Pressable>
              </>
            ) : (
              <Text style={ui.hint}>{t.theory.doneHint}</Text>
            )}
            <Pressable
              onPress={() => {
                setAnswers(content.questions.map(() => null));
                setReading(true);
              }}
              accessibilityRole="button"
              style={s.secondary}
            >
              <Text style={s.secondaryText}>{t.theory.restart}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.display,
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  index: { color: colors.muted, fontSize: 14, width: 24 },
  rowLabel: { color: colors.text, fontSize: 17, flex: 1 },
  chevron: { color: colors.muted, fontSize: 22 },
  lesson: { paddingBottom: space.xl },
  lessonBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm },
  quit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quitText: { color: colors.text, fontSize: 20 },
  lessonOf: { color: colors.muted, fontSize: 13, marginLeft: space.sm },
  lessonTitle: {
    color: colors.text,
    fontSize: 28,
    fontFamily: fonts.display,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
  question: { color: colors.text, fontSize: 17, fontWeight: '600', paddingHorizontal: space.lg, marginBottom: space.sm },
  footer: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.md },
  primary: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.gold,
  },
  primaryText: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  secondary: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontWeight: '600', fontSize: 16 },
  score: { color: colors.gold, fontSize: 18, fontWeight: '700' },
});
