import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotePlayer } from '../audio/useNotePlayer';
import { Fretboard } from '../components/Fretboard';
import { Chip, ChipRow, PrimaryButton, SecondaryButton, Sheet, useTextStyles } from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { OPEN_MIDI } from '../theory/notes';
import {
  allInversions,
  inZone,
  STRING_SET_IDS,
  STRING_SETS,
  StringSetId,
  TriadChord,
  TriadVoicing,
  voicingRange,
} from '../theory/triads';
import { triadMarkers } from './triadMarkers';

const sameShape = (a: TriadVoicing | null | undefined, b: TriadVoicing | null | undefined) =>
  !!a && !!b && a.frets.join() === b.frets.join();

/**
 * « Toutes les inversions » d'un accord.
 *
 * Elle montre ce que la zone ne montre pas : les autres formes du même accord,
 * sur le manche entier. « Choisir » en fixe une pour cet accord, et
 * l'enchaînement se recalcule autour d'elle.
 */
export function InversionsSheet({
  visible,
  chord,
  label,
  set: initialSet,
  proposed,
  zone,
  flats,
  onChoose,
  onClose,
}: {
  visible: boolean;
  chord: TriadChord;
  label: string;
  set: StringSetId;
  /** La forme que l'enchaînement propose aujourd'hui pour cet accord. */
  proposed: TriadVoicing | null;
  zone: { lo: number; hi: number };
  flats: boolean;
  onChoose: (set: StringSetId, voicing: TriadVoicing) => void;
  onClose: () => void;
}) {
  const { settings, notation, t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const { playStrum } = useNotePlayer();
  const [set, setSet] = useState<StringSetId>(initialSet);
  const [preview, setPreview] = useState<TriadVoicing | null>(proposed);

  useEffect(() => {
    if (visible) {
      setSet(initialSet);
      setPreview(proposed);
    }
    // On repart de la proposition à chaque ouverture, pas à chaque changement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const forms = useMemo(() => allInversions(chord, set), [chord, set]);
  const groups = [0, 1, 2].map((inversion) => ({
    inversion,
    forms: forms.filter((v) => v.inversion === inversion),
  }));
  const shown = preview && forms.some((v) => sameShape(v, preview)) ? preview : null;

  const play = (v: TriadVoicing) => playStrum(STRING_SETS[set].map((string, i) => OPEN_MIDI[string] + v.frets[i]));

  return (
    <Sheet
      visible={visible}
      title={t.triads.inversionsTitle(label)}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <View style={s.footer}>
          <SecondaryButton label={t.triads.listen} disabled={!shown} style={s.grow} onPress={() => shown && play(shown)} />
          <PrimaryButton
            label={t.triads.choose}
            disabled={!shown}
            style={s.grow}
            onPress={() => {
              if (!shown) return;
              onChoose(set, shown);
              onClose();
            }}
          />
        </View>
      }
    >
      <ChipRow>
        {STRING_SET_IDS.map((id) => (
          <Chip key={id} label={t.triads.stringSets[id]} selected={id === set} onPress={() => setSet(id)} />
        ))}
      </ChipRow>

      <View style={s.board}>
        {shown ? (
          <Fretboard
            markers={triadMarkers(chord, set, shown.frets, settings.display, notation, flats)}
            focusFret={Math.max(0, voicingRange(shown)[0] - 1)}
          />
        ) : (
          <Text style={ui.hint}>{t.triads.pickSong}</Text>
        )}
      </View>

      {groups.map((group) =>
        group.forms.length ? (
          <View key={group.inversion}>
            <Text style={s.groupTitle}>{t.triads.inversion[group.inversion]}</Text>
            {group.forms.map((v) => {
              const [a, b] = voicingRange(v);
              const isProposed = set === initialSet && sameShape(v, proposed);
              const isSelected = sameShape(v, shown);
              return (
                <Pressable
                  key={v.frets.join()}
                  onPress={() => {
                    setPreview(v);
                    play(v);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[s.row, isSelected && s.rowSelected]}
                >
                  <View style={s.rowText}>
                    <Text style={s.rowTitle}>{t.triads.fretsOf(a, b)}</Text>
                    <Text style={s.rowFrets}>({v.frets.join(', ')})</Text>
                  </View>
                  <Text style={[s.badge, isProposed && s.badgeProposed]}>
                    {isProposed ? t.triads.proposed : inZone(v, zone.lo, zone.hi) ? t.triads.zoneFrets(zone.lo, zone.hi) : t.triads.otherZone}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null,
      )}
    </Sheet>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    footer: { flexDirection: 'row', gap: space.md },
    grow: { flex: 1 },
    board: { marginTop: space.lg, minHeight: 60 },
    groupTitle: { ...type.headline, color: c.label, paddingHorizontal: space.lg, marginTop: space.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: size.rowTwoLine,
      marginHorizontal: space.lg,
      marginTop: space.sm,
      paddingHorizontal: space.md,
      borderRadius: radius.chip,
      borderWidth: 1,
      borderColor: c.separator,
      backgroundColor: c.card,
    },
    rowSelected: { borderColor: c.accent, borderWidth: 2 },
    rowText: { flex: 1 },
    rowTitle: { ...type.body, color: c.label },
    rowFrets: { ...type.caption, color: c.secondary },
    badge: { ...type.caption, color: c.secondary },
    badgeProposed: { color: c.accent, fontWeight: '700' },
  });
