import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { radius, size, Theme, useStyles, useTheme } from '../../theme';

/**
 * Une pastille. Choisie, elle est remplie d'accent **et** plus grasse : la
 * couleur seule ne dit rien à qui ne distingue pas le marron de l'ivoire.
 */
export function Chip({
  label,
  selected,
  onPress,
  disabled,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[s.chip, selected && s.chipSelected, disabled && s.disabled, style]}
    >
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const s = useStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[s.chipRow, style]}
    >
      {children}
    </ScrollView>
  );
}

/** Le contrôle segmenté d'iOS. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[s.segment, active && s.segmentActive]}
          >
            <Text style={[s.segmentText, active && s.segmentTextActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const s = useStyles(makeStyles);
  // `Switch` wants colours, not styles, so it reads the palette directly.
  const { c } = useTheme();
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: c.accent, false: c.separator }}
        thumbColor={c.card}
      />
    </View>
  );
}

/** Un compteur − valeur +, pour les questions d'une séance par exemple. */
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Le pas du compteur : les questions se comptent par cinq. */
  step?: number;
  format?: (v: number) => string;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <View style={s.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`${label} −`}
          style={[s.stepButton, value <= min && s.disabled]}
        >
          <Text style={s.stepSign}>−</Text>
        </Pressable>
        <Text style={[s.stepValue, s.tabular]}>{format ? format(value) : String(value)}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={`${label} +`}
          style={[s.stepButton, value >= max && s.disabled]}
        >
          <Text style={s.stepSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [s.primary, pressed && s.pressed, disabled && s.disabled, style]}
    >
      <Text style={s.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  destructive,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Une action qu'on ne peut pas défaire : elle se dit en rouge, sans crier. */
  destructive?: boolean;
  style?: ViewStyle;
}) {
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        s.secondary,
        destructive && s.secondaryDestructive,
        pressed && s.pressed,
        disabled && s.disabled,
        style,
      ]}
    >
      <Text style={[s.secondaryText, destructive && s.secondaryTextDestructive]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    /** Le rouge ne remplit pas le bouton : il le borde et colore son texte. */
    secondaryDestructive: { borderColor: c.destructive },
    secondaryTextDestructive: { color: c.destructive },
    chip: {
      minHeight: size.touch,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: c.fill,
      borderWidth: 1.5,
      borderColor: 'transparent',
      marginRight: space.sm,
    },
    chipSelected: { backgroundColor: c.accent, borderColor: c.onAccent },
    chipText: { ...type.body, color: c.label },
    chipTextSelected: { color: c.onAccent, fontWeight: '600' },
    chipRow: { paddingHorizontal: space.lg, paddingVertical: space.xs },
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.fill,
      borderRadius: radius.chip,
      padding: 3,
      marginHorizontal: space.lg,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 34,
      borderRadius: radius.icon,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    segmentActive: { backgroundColor: c.card, borderColor: c.separator },
    segmentText: { ...type.subhead, color: c.secondary },
    segmentTextActive: { color: c.label, fontWeight: '600' },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: size.row,
      paddingHorizontal: space.lg,
    },
    toggleLabel: { ...type.body, color: c.label, flex: 1, marginRight: space.md },
    stepper: { flexDirection: 'row', alignItems: 'center' },
    stepButton: {
      width: size.touch,
      height: size.touch,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepSign: { ...type.section, color: c.accent },
    stepValue: { ...type.body, color: c.label, minWidth: 52, textAlign: 'center' },
    tabular: { fontVariant: ['tabular-nums'] },
    primary: {
      minHeight: size.button,
      borderRadius: radius.button,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.lg,
    },
    primaryText: { ...type.headline, color: c.onAccent },
    secondary: {
      minHeight: size.buttonSmall,
      borderRadius: radius.button,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.lg,
    },
    secondaryText: { ...type.body, color: c.label },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.4 },
  });
