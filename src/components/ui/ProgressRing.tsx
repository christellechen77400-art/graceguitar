import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Theme, useStyles, useTheme } from '../../theme';

/**
 * L'anneau de progression.
 *
 * Le remplissage est un arc, pas un disque : à 0 comme à 1 le résultat reste
 * lisible d'un coup d'œil, ce qu'un disque qui se remplit ne permet pas.
 */
export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 6,
  label,
  caption,
}: {
  /** De 0 à 1. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Au centre, en gros : « 3/12 », un pourcentage… */
  label?: string;
  /** Sous l'anneau. */
  caption?: string;
}) {
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={s.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={c.fill}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={c.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            // Le départ est à midi plutôt qu'à trois heures.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {label ? (
          <View style={[StyleSheet.absoluteFill, s.center]}>
            <Text style={s.label}>{label}</Text>
          </View>
        ) : null}
      </View>
      {caption ? <Text style={s.caption}>{caption}</Text> : null}
    </View>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    wrap: { alignItems: 'center' },
    center: { alignItems: 'center', justifyContent: 'center' },
    label: { ...type.headline, color: c.label, fontVariant: ['tabular-nums'] },
    caption: { ...type.caption, color: c.secondary, marginTop: space.xs },
  });
