import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSettings, DisplayMode } from '../state/settings';
import { colors, space } from '../theme';
import { keyLabel } from '../theory/notes';

export function Chip({
  label,
  selected,
  onPress,
  dot,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  dot?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {dot ? <View style={[styles.dot, selected && { backgroundColor: colors.ink }]} /> : null}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Section({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.gold, false: colors.surfaceHi }}
        thumbColor={colors.cream}
      />
    </View>
  );
}

export function KeyPicker({ label, highlight = [] }: { label: string; highlight?: number[] }) {
  const { settings, notation, update } = useSettings();
  return (
    <Section title={label}>
      <ChipRow>
        {Array.from({ length: 12 }, (_, pc) => (
          <Chip
            key={pc}
            label={keyLabel(pc, notation)}
            selected={settings.keyRoot === pc}
            dot={highlight.includes(pc)}
            onPress={() => update({ keyRoot: pc })}
          />
        ))}
      </ChipRow>
    </Section>
  );
}

export function DisplayPicker() {
  const { settings, t, update } = useSettings();
  return (
    <Segmented<DisplayMode>
      value={settings.display}
      onChange={(display) => update({ display })}
      options={[
        { value: 'clean', label: t.display.clean },
        { value: 'notes', label: t.display.notes },
        { value: 'intervals', label: t.display.intervals },
      ]}
    />
  );
}

export const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: space.sm,
  },
  // Selected chips are filled and outlined, and their text is heavier: a chip has
  // to read as chosen without relying on the reader telling gold from indigo.
  chipSelected: { backgroundColor: colors.gold, borderColor: colors.cream, borderWidth: 2 },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  chipTextSelected: { color: colors.ink, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginLeft: 6 },
  chipRow: { paddingHorizontal: space.lg },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    marginHorizontal: space.lg,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  // The chosen segment is raised, outlined and its label is heavier, so the state
  // survives a reader who cannot tell the two surfaces apart.
  segmentActive: { backgroundColor: colors.surfaceHi, borderColor: colors.border },
  segmentText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: colors.text, fontWeight: '700' },
  section: { marginTop: space.lg },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  hint: { color: colors.muted, fontSize: 13, paddingHorizontal: space.lg, marginBottom: space.sm, lineHeight: 18 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
  toggleLabel: { color: colors.text, fontSize: 15, flex: 1, marginRight: space.md },
  body: { color: colors.text, fontSize: 15, paddingHorizontal: space.lg, lineHeight: 21 },
});
