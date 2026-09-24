import React from 'react';
import { useSettings, DisplayMode } from '../../state/settings';
import { keyLabel } from '../../theory/notes';
import { Chip, ChipRow, Segmented } from './controls';
import { SectionHeader } from './layout';

/**
 * Les douze tonalités. Le point marque celles qui reviennent le plus souvent en
 * louange — il ne colore pas la pastille, il ajoute une information.
 */
export function KeyPicker({
  label,
  highlight = [],
  value,
  onChange,
}: {
  label: string;
  highlight?: number[];
  /** Par défaut, la tonalité des réglages. */
  value?: number;
  onChange?: (pc: number) => void;
}) {
  const { settings, notation, update } = useSettings();
  const current = value ?? settings.keyRoot;
  return (
    <>
      <SectionHeader>{label}</SectionHeader>
      <ChipRow>
        {Array.from({ length: 12 }, (_, pc) => (
          <Chip
            key={pc}
            label={keyLabel(pc, notation)}
            selected={current === pc}
            onPress={() => (onChange ? onChange(pc) : update({ keyRoot: pc }))}
          />
        ))}
      </ChipRow>
    </>
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
