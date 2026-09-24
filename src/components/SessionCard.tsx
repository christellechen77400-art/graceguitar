/**
 * La séance du jour : trois exercices d'environ dix questions.
 *
 * Elle est la même sur l'accueil et dans l'onglet Exercices — c'est le même
 * objet, pas deux cartes qui se ressemblent. Ceux qui sont déjà faits aujourd'hui
 * sont barrés et cochés : on reprend la séance là où elle s'est arrêtée, on ne la
 * recommence pas.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui/layout';
import { PrimaryButton } from './ui/controls';
import { ProgressRing } from './ui/ProgressRing';
import { useTextStyles } from './ui';
import { DailyExercise, dailySession } from '../practice/daily';
import { ExerciseId, Question } from '../practice/engine';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';

export function SessionCard({
  session,
  done,
  sunday,
  onStart,
}: {
  session: ReturnType<typeof dailySession>;
  /** Les exercices déjà faits aujourd'hui. */
  done: Set<ExerciseId>;
  /** Le dimanche, la séance est plus courte et s'appelle autrement. */
  sunday?: boolean;
  onStart: (questions: Question[]) => void;
}) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();

  const finished = session.exercises.filter((e) => done.has(e.id)).length;
  const started = finished > 0 && finished < session.exercises.length;

  // On reprend la séance là où elle s'est arrêtée : les exercices déjà faits
  // aujourd'hui ne sont pas reposés. Tous faits, on la refait en entier.
  const start = () => {
    const pending = session.exercises.filter((e) => !done.has(e.id));
    const asked = pending.length ? pending : session.exercises;
    onStart(asked.flatMap((e) => e.questions));
  };

  return (
    <Card>
      <View style={s.head}>
        <ProgressRing
          progress={session.exercises.length ? finished / session.exercises.length : 0}
          label={`${finished}/${session.exercises.length}`}
        />
        <View style={s.text}>
          <Text style={s.title}>{sunday ? t.today.openedSet : t.today.session}</Text>
          <Text style={ui.hint}>{t.today.sessionHint(session.questionCount, session.minutes)}</Text>
        </View>
      </View>

      {session.exercises.map((exercise) => (
        <ExerciseLine key={exercise.id} exercise={exercise} done={done.has(exercise.id)} />
      ))}

      <View style={s.actions}>
        <PrimaryButton
          label={started ? t.today.continue : t.today.start}
          onPress={start}
          disabled={!session.questionCount}
        />
      </View>
    </Card>
  );
}

function ExerciseLine({ exercise, done }: { exercise: DailyExercise; done: boolean }) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  return (
    <View style={s.exercise}>
      <Text style={s.check}>{done ? '✓' : ''}</Text>
      <Text style={[s.exerciseName, done && s.exerciseDone]}>{t.practice.exercises[exercise.id]}</Text>
      <Text style={s.exerciseCount}>{t.today.questionCount(exercise.questions.length)}</Text>
    </View>
  );
}

const makeStyles = ({ c, type, space, size }: Theme) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center' },
    text: { flex: 1, marginLeft: space.lg },
    title: { ...type.cardTitle, color: c.label },
    exercise: { flexDirection: 'row', alignItems: 'center', minHeight: size.row, marginTop: space.xs },
    check: { ...type.body, color: c.accent, width: 22 },
    exerciseName: { ...type.body, color: c.label, flex: 1 },
    exerciseDone: { color: c.secondary, textDecorationLine: 'line-through' },
    exerciseCount: { ...type.caption, color: c.secondary, marginLeft: space.sm },
    actions: { marginTop: space.md },
  });
