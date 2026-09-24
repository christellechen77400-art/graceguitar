import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker } from '../components/Fretboard';
import { Screen, Segmented, Toggle, useTextStyles } from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { FRET_COUNT, noteName, pcAt, prefersFlats, STRING_COUNT } from '../theory/notes';
import { CagedScreen } from './CagedScreen';
import { ScalesScreen } from './ScalesScreen';

export type NeckMode = 'scales' | 'caged' | 'notes';

/**
 * Le manche, sous ses trois angles.
 *
 * Gammes et CAGED étaient deux onglets ; ils sont deux façons de regarder le
 * même manche, donc deux modes d'un seul onglet. Le troisième — les notes nues —
 * est celui qu'on ouvre pour retrouver une note qu'on cherche.
 */
export function NeckScreen() {
  const { t } = useSettings();
  const [mode, setMode] = useState<NeckMode>('scales');

  return (
    <Screen tab="neck" title={t.tabs.neck}>
      <Segmented<NeckMode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'scales', label: t.neck.scales },
          { value: 'caged', label: t.neck.caged },
          { value: 'notes', label: t.neck.notes },
        ]}
      />
      {mode === 'scales' && <ScalesScreen />}
      {mode === 'caged' && <CagedScreen />}
      {mode === 'notes' && <NeckNotesPanel />}
    </Screen>
  );
}

/** Les sept naturelles, en classes de hauteur : tout le reste est une altération. */
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

/**
 * Le manche nu : toutes les notes, sans gamme ni accord.
 *
 * Les naturelles sont pleines et les altérations creuses : la différence se voit
 * sans avoir à distinguer deux teintes. L'orthographe suit l'armure — Fa♯ en Ré,
 * Sol♭ en Mi♭ — pour que la note lue soit celle qu'on jouerait.
 */
function NeckNotesPanel() {
  const { settings, notation, t } = useSettings();
  const ui = useTextStyles();
  const s = useStyles(makeStyles);
  const [accidentals, setAccidentals] = useState(false);
  const flats = prefersFlats(settings.keyRoot);

  const markers = useMemo(() => {
    const out: Marker[] = [];
    for (let string = 0; string < STRING_COUNT; string++) {
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const pc = pcAt(string, fret);
        const natural = NATURAL.includes(pc);
        if (!natural && !accidentals) continue;
        out.push({
          string,
          fret,
          kind: natural ? 'chord' : 'ghost',
          label: noteName(pc, notation, flats),
        });
      }
    }
    return out;
  }, [accidentals, notation, flats]);

  return (
    <View>
      <View style={s.section}>
        <Fretboard markers={markers} />
      </View>
      <Toggle label={t.neck.accidentals} value={accidentals} onChange={setAccidentals} />
      <Text style={ui.hint}>{t.neck.notesHint}</Text>
    </View>
  );
}

/** Le bloc d'une section sans titre : la même respiration qu'un `SectionHeader`. */
const makeStyles = ({ space }: Theme) => StyleSheet.create({ section: { marginTop: space.xl } });
