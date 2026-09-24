import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Chip,
  ChipRow,
  PrimaryButton,
  SecondaryButton,
  useTextStyles,
} from '../components/ui';
import { levelFrom, Level, ONBOARDING, practiceFor } from '../practice/onboarding';
import { useSettings } from '../state/settings';
import { Theme, useStyles, useTheme } from '../theme';
import { keyLabel } from '../theory/notes';
import { CAPO_SHAPES } from '../theory/worship';

/** Le prénom d'abord, les cinq questions, les formes préférées, puis le niveau. */
type Step = { kind: 'name' } | { kind: 'question'; index: number } | { kind: 'shapes' };

const STEPS: Step[] = [
  { kind: 'name' },
  ...ONBOARDING.map((_, index) => ({ kind: 'question' as const, index })),
  { kind: 'shapes' },
];

/**
 * The welcome questions, one per screen, every one of them skippable.
 *
 * Answered or skipped, the same thing happens at the end: a level is worked out
 * and the exercise settings are set to match. Nothing is locked in — the settings
 * screen changes any of it — so there is no reason to make anyone answer.
 *
 * Le prénom et les formes préférées ne comptent pas dans le niveau : ils ne
 * disent rien de ce que le joueur sait, seulement de la façon dont il joue. Le
 * prénom sert à le saluer et part avec le profil s'il crée un compte ; les formes
 * serviront à lui conseiller un capo.
 */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { settings, notation, t, update } = useSettings();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.firstName);
  const [shapes, setShapes] = useState<number[]>(settings.preferredShapes);
  const [answers, setAnswers] = useState<(number | null)[]>(() => ONBOARDING.map(() => null));
  const [level, setLevel] = useState<Level | null>(null);

  const finish = (final: (number | null)[]) => {
    const decided = levelFrom(final);
    // The level picks the starting settings, and the player's own tweaks after
    // that are theirs: this only runs once.
    update({
      onboarded: true,
      level: decided,
      practice: practiceFor(decided),
      firstName: name.trim(),
      preferredShapes: shapes,
    });
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

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const next = () => (last ? finish(answers) : setStep(step + 1));

  const toggleShape = (pc: number) =>
    setShapes((prev) => (prev.includes(pc) ? prev.filter((p) => p !== pc) : [...prev, pc].sort()));

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{t.onboarding.title}</Text>
        <Text style={ui.hint}>{t.onboarding.intro}</Text>
        <Text style={s.counter}>
          {step + 1} / {STEPS.length}
        </Text>

        {current.kind === 'name' && (
          <>
            <Text style={s.question}>{t.onboarding.name.question}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.onboarding.name.placeholder}
              placeholderTextColor={c.secondary}
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="done"
              onSubmitEditing={next}
              style={s.input}
              accessibilityLabel={t.onboarding.name.question}
            />
            <Text style={ui.hint}>{t.onboarding.name.hint}</Text>
          </>
        )}

        {current.kind === 'question' && (
          <>
            <Text style={s.question}>{t.onboarding.questions[ONBOARDING[current.index].id]}</Text>
            <ChipRow>
              {t.onboarding.answers[ONBOARDING[current.index].id].map((choice, i) => (
                <Chip
                  key={choice}
                  label={choice}
                  selected={answers[current.index] === i}
                  onPress={() => setAnswers(answers.map((a, j) => (j === current.index ? i : a)))}
                />
              ))}
            </ChipRow>
          </>
        )}

        {current.kind === 'shapes' && (
          <>
            <Text style={s.question}>{t.onboarding.capo.question}</Text>
            <Text style={ui.hint}>{t.onboarding.capo.hint}</Text>
            <ChipRow>
              {CAPO_SHAPES.map((pc) => (
                <Chip
                  key={pc}
                  label={keyLabel(pc, notation)}
                  selected={shapes.includes(pc)}
                  onPress={() => toggleShape(pc)}
                />
              ))}
            </ChipRow>
          </>
        )}

        <View style={s.footer}>
          <PrimaryButton
            label={last ? t.onboarding.finish : t.onboarding.next}
            // Une question sans réponse ne bloque pas : elle compte simplement
            // pour rien. Le prénom et les formes, eux, ont toujours une valeur.
            disabled={current.kind === 'question' && answers[current.index] === null}
            onPress={next}
          />
          <SecondaryButton label={t.onboarding.skip} onPress={skipAll} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
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
    input: {
      ...type.body,
      color: c.label,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      borderRadius: radius.chip,
      paddingHorizontal: space.md,
      marginHorizontal: space.lg,
      marginBottom: space.sm,
      minHeight: size.button,
    },
    level: { ...type.greeting, color: c.accent, paddingHorizontal: space.lg, marginTop: space.sm },
    footer: { paddingHorizontal: space.lg, marginTop: space.xl, gap: space.md },
  });
