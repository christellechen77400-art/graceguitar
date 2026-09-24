import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip, ChipRow, styles as ui } from '../components/ui';
import { levelFrom, Level, ONBOARDING, practiceFor } from '../practice/onboarding';
import { useSettings } from '../state/settings';
import { colors, fonts, space } from '../theme';

/**
 * The welcome questions, one per screen, every one of them skippable.
 *
 * Answered or skipped, the same thing happens at the end: a level is worked out
 * and the exercise settings are set to match. Nothing is locked in — the settings
 * screen changes any of it — so there is no reason to make anyone answer.
 */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t, update } = useSettings();
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
          <Pressable onPress={onDone} accessibilityRole="button" style={s.primary}>
            <Text style={s.primaryText}>{t.onboarding.finish}</Text>
          </Pressable>
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
          <Pressable
            onPress={() => (last ? finish(answers) : setStep(step + 1))}
            accessibilityRole="button"
            style={[s.primary, chosen === null && s.disabled]}
            disabled={chosen === null}
          >
            <Text style={s.primaryText}>{last ? t.onboarding.finish : t.onboarding.next}</Text>
          </Pressable>
          <Pressable onPress={skipAll} accessibilityRole="button" style={s.secondary}>
            <Text style={s.secondaryText}>{t.onboarding.skip}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  page: { paddingVertical: space.xl },
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.display,
    paddingHorizontal: space.lg,
  },
  counter: { color: colors.muted, fontSize: 13, paddingHorizontal: space.lg, marginTop: space.lg },
  question: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.display,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
    marginBottom: space.md,
  },
  level: {
    color: colors.gold,
    fontSize: 56,
    fontFamily: fonts.display,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  footer: { paddingHorizontal: space.lg, marginTop: space.xl, gap: space.md },
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
  disabled: { opacity: 0.35 },
});
