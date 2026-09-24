/**
 * La pastille de série : une flamme et le nombre de jours d'affilée.
 *
 * Elle vit hors des écrans parce que deux les portent — le titre de l'accueil et
 * celui des Exercices — et qu'une pastille écrite deux fois finit par diverger.
 * Le nombre est écrit en clair : la flamme ne porte jamais l'information seule.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlameIcon } from './icons';
import { useSettings } from '../state/settings';
import { tabularNums, Theme, useStyles, useTheme } from '../theme';

export function StreakPill({ days }: { days: number }) {
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  const { t } = useSettings();
  return (
    <View
      style={s.pill}
      accessibilityRole="text"
      accessibilityLabel={`${t.today.streakLabel} : ${t.today.streakDays(days)}`}
    >
      <FlameIcon color={c.accent} size={16} />
      <Text style={s.text}>{t.today.streakDays(days)}</Text>
    </View>
  );
}

const makeStyles = ({ c, type, space, radius }: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      paddingHorizontal: space.md,
      minHeight: 32,
      borderRadius: radius.pill,
      backgroundColor: c.fill,
    },
    text: { ...type.caption, ...tabularNums, color: c.label },
  });
