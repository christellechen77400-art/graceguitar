import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker } from '../components/Fretboard';
import { Chip, ChipRow, KeyPicker, SectionHeader, Toggle, useTextStyles } from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { FRET_COUNT, INTERVAL_LABELS, mod12, noteName, pcAt, prefersFlats, STRING_COUNT } from '../theory/notes';

/** Les sept naturelles, en classes de hauteur : tout le reste est une altération. */
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

/**
 * Le manche nu : toutes les notes, sans gamme ni accord.
 *
 * Les naturelles sont pleines et les altérations creuses : la différence se voit
 * sans avoir à distinguer deux teintes. L'orthographe suit l'armure — Fa♯ en Ré,
 * Sol♭ en Mi♭ — pour que la note lue soit celle qu'on jouerait.
 */
export function NeckNotesPanel() {
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

/** Les degrés qu'on peut mettre en valeur, de la fondamentale à la septième. */
const INTERVAL_CHOICES = [0, 3, 4, 5, 7, 10, 11];

/**
 * Les intervalles : le manche lu depuis une fondamentale.
 *
 * On choisit la fondamentale et les degrés qui comptent (la tierce, la quinte…),
 * et le manche entier ne montre qu'eux. C'est la couche où l'on voit que la tierce
 * est toujours à la même distance de la fondamentale, quelle que soit la corde.
 */
export function IntervalsPanel() {
  const { settings, notation, t } = useSettings();
  const ui = useTextStyles();
  const s = useStyles(makeStyles);
  const [chosen, setChosen] = useState<number[]>([4, 7]);
  const root = settings.keyRoot;
  const flats = prefersFlats(root);

  const markers = useMemo(() => {
    const out: Marker[] = [];
    for (let string = 0; string < STRING_COUNT; string++) {
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const pc = pcAt(string, fret);
        const step = mod12(pc - root);
        if (step !== 0 && !chosen.includes(step)) continue;
        out.push({
          string,
          fret,
          kind: step === 0 ? 'root' : 'chord',
          label: settings.display === 'notes' ? noteName(pc, notation, flats) : INTERVAL_LABELS[step],
        });
      }
    }
    return out;
  }, [chosen, root, settings.display, notation, flats]);

  const toggle = (step: number) =>
    setChosen((current) => (current.includes(step) ? current.filter((x) => x !== step) : [...current, step]));

  return (
    <View>
      <KeyPicker label={t.root} />
      <SectionHeader>{t.targets}</SectionHeader>
      <ChipRow>
        {INTERVAL_CHOICES.filter((step) => step !== 0).map((step) => (
          <Chip key={step} label={INTERVAL_LABELS[step]} selected={chosen.includes(step)} onPress={() => toggle(step)} />
        ))}
      </ChipRow>
      <Text style={ui.hint}>{t.targetsHint}</Text>
      <View style={s.section}>
        <Fretboard markers={markers} />
      </View>
    </View>
  );
}

/** Le bloc d'une section sans titre : la même respiration qu'un `SectionHeader`. */
const makeStyles = ({ space }: Theme) => StyleSheet.create({ section: { marginTop: space.xl } });
