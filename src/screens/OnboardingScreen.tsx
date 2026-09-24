import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip, ChipRow, PrimaryButton, SecondaryButton, useTextStyles } from '../components/ui';
import { levelFrom, Level, ONBOARDING, practiceFor } from '../practice/onboarding';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';

/**
 * The welcome questions, one per screen, every one of them skippable.
 *
 * Answered or skipped, the same thing happens at the end: a level is worked out
 * and the exercise settings are set to match. Nothing is locked in — the settings
 * screen changes any of it — so there is no reason to make anyone answer.
 */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t, update } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => ONBOARDING.map(() => null));
  const [level, setLevel] = useState<Level | null>(null);

  const finish = (final: (number | null)[]) => {
    const decided = levelFrom(final);
    // The level picks the starting settings, and the player's own tweaks after
    // that are theirs: this only runs once.
    update({ onboarded: true, level: decided, practice: practiceFor(decided) });
    setLevel(decided);
  };

  const skipAll = () => finish(ONBOARDING.map(() => null));

  if (level !== null) {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.page}>
          <Text style={s.title}>{t.onboarding.levelTitle}</Text>
          <Text style={s.level}>{level}</Text>
          <Text style={ui.body}>{t.onboarding.levels[level]}</Text>
          <PrimaryButton label={t.onboarding.finish} onPress={onDone} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const question = ONBOARDING[step];
  const chosen = answers[step];
  const last = step === ONBOARDING.length - 1;
  const choices = t.onboarding.answers[question.id];

  const answer = (index: number) => {
    const next = [...answers];
    next[step] = index;
    setAnswers(next);
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.page}>
        <Text style={s.title}>{t.onboarding.title}</Text>
        <Text style={ui.hint}>{t.onboarding.intro}</Text>
        <Text style={s.counter}>
          {step + 1} / {ONBOARDING.length}
        </Text>

        <Text style={s.question}>{t.onboarding.questions[question.id]}</Text>
        <ChipRow>
          {choices.map((choice, i) => (
            <Chip key={choice} label={choice} selected={chosen === i} onPress={() => answer(i)} />
          ))}
        </ChipRow>

        <View style={s.footer}>
          <PrimaryButton
            label={last ? t.onboarding.finish : t.onboarding.next}
            onPress={() => (last ? finish(answers) : setStep(step + 1))}
            disabled={chosen === null}
          />
          <SecondaryButton label={t.onboarding.skip} onPress={skipAll} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    page: { paddingVertical: space.xl },
    title: { ...type.greeting, color: c.label, paddingHorizontal: space.lg },
    counter: { ...type.caption, color: c.secondary, paddingHorizontal: space.lg, marginTop: space.lg },
    question: {
      ...type.section,
      color: c.label,
      paddingHorizontal: space.lg,
      marginTop: space.sm,
      marginBottom: space.md,
    },
    level: { ...type.greeting, color: c.accent, paddingHorizontal: space.lg, marginTop: space.sm },
    footer: { paddingHorizontal: space.lg, marginTop: space.xl, gap: space.md },
  });
