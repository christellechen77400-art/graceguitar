import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Chip,
  ChipRow,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Segmented,
  Sheet,
  Stepper,
  useTextStyles,
} from '../../components/ui';
import { originLabel } from '../../songs/labels';
import { Song } from '../../songs/model';
import { useSettings } from '../../state/settings';
import { Theme, useStyles } from '../../theme';
import { nashvilleLabel } from '../../theory/nashville';
import { mod12, noteName, prefersFlats } from '../../theory/notes';
import { probableChords, suggestCapo } from '../../theory/worship';
import { Grid } from './Grid';

/**
 * La fiche d'un chant.
 *
 * Tout ce qu'on se demande avant de le jouer est sur un écran : dans quelle
 * tonalité il est aujourd'hui, quel capo poser, quelles formes prendre, et la
 * grille. La grille peut s'écrire en accords — ce qu'on joue — ou en chiffres —
 * ce qu'on transpose de tête ; c'est le même contenu, lu de deux façons.
 *
 * Un chant sans grille n'est pas un chant vide : beaucoup se jouent d'oreille, et
 * la fiche donne alors les accords probables de la tonalité. La grille reste
 * facultative, et s'ajoute plus tard.
 */
export function SongSheet({
  song,
  dayKey,
  capo,
  onClose,
  onKey,
  onCapo,
  onGrid,
  onPaste,
  onTriads,
}: {
  song: Song | null;
  /** La tonalité du jour : celle du set, ou celle du chant. */
  dayKey: number;
  capo: number;
  onClose: () => void;
  onKey: (key: number) => void;
  onCapo: (capo: number) => void;
  onGrid: () => void;
  onPaste: () => void;
  /** Ouvre les triades de ce chant dans l'onglet Manche. */
  onTriads: () => void;
}) {
  const { t, notation, settings } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [view, setView] = useState<'chords' | 'nashville'>('chords');

  if (!song) return null;

  const sections = song.sections ?? [];
  const shapes = mod12(dayKey - capo);
  const suggested = suggestCapo(dayKey, settings.preferredShapes);

  return (
    <Sheet visible title={song.title} onClose={onClose} closeLabel={t.close}>
      <Text style={s.title} accessibilityRole="header">
        {song.title}
      </Text>
      <Text style={ui.hint}>
        {originLabel(song.source, t)} · {song.mode === 'minor' ? t.worship.mode.minor : t.worship.mode.major}
      </Text>

      <SectionHeader>{t.key}</SectionHeader>
      <ChipRow>
        {Array.from({ length: 12 }, (_, pc) => (
          <Chip
            key={pc}
            label={noteName(pc, notation, prefersFlats(pc))}
            selected={pc === dayKey}
            onPress={() => onKey(pc)}
          />
        ))}
      </ChipRow>

      <Stepper label={t.sets.capo} value={capo} onChange={onCapo} min={0} max={11} format={capoLabel} />
      <Text style={ui.hint}>
        {t.worship.shapes} : {noteName(shapes, notation, prefersFlats(dayKey))}
        {capo === 0 ? ` · ${t.worship.noCapo}` : ` · ${t.sets.capo} ${capo}`}
      </Text>
      {/* Le capo conseillé est une action, pas une note de bas de page : on le
          propose tant qu'il n'est pas appliqué, et il disparaît une fois posé. */}
      {capo !== suggested ? (
        <ChipRow>
          <Chip
            label={`${t.sets.capo} ${suggested}`}
            onPress={() => onCapo(suggested)}
          />
        </ChipRow>
      ) : null}

      {sections.length ? (
        <>
          <SectionHeader action={{ label: t.worship.editGrid, onPress: onGrid }}>{t.worship.grid}</SectionHeader>
          <View style={s.switcher}>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'chords', label: t.worship.chords },
                { value: 'nashville', label: t.worship.nashville },
              ]}
            />
          </View>
          <View style={s.grid}>
            <Grid sections={sections} songKey={dayKey} mode={song.mode} view={view} />
          </View>
        </>
      ) : (
        <>
          <SectionHeader>{t.worship.keyOnly}</SectionHeader>
          <Text style={ui.hint}>{t.worship.probable}</Text>
          <View style={s.probable}>
            {probableChords(dayKey, song.mode).map(({ nashville, chord }) => (
              <View key={nashville} style={s.probableChip}>
                <Text style={s.probableName}>{nashvilleLabel(chord, dayKey, song.mode, notation)}</Text>
                <Text style={s.probableDegree}>{nashville}</Text>
              </View>
            ))}
          </View>
          <View style={s.actions}>
            <PrimaryButton label={t.worship.addGrid} onPress={onGrid} />
          </View>
        </>
      )}

      {song.sections?.length ? (
        <View style={s.actions}>
          <PrimaryButton label={t.triads.seeTriads} onPress={onTriads} />
        </View>
      ) : null}
      <View style={s.actions}>
        <SecondaryButton label={t.worship.pasteChart} onPress={onPaste} />
      </View>
      {song.lyrics ? <Text style={ui.hint}>{t.worship.lyricsNote}</Text> : null}
    </Sheet>
  );
}

/** « Sans capo » plutôt qu'un zéro : le capo zéro n'est pas un capo. */
const capoLabel = (capo: number) => (capo === 0 ? '—' : String(capo));

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    title: { ...type.chordName, color: c.label, paddingHorizontal: space.lg, marginTop: space.md },
    switcher: { marginBottom: space.md },
    grid: { paddingHorizontal: space.lg },
    probable: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg },
    probableChip: {
      minWidth: 62,
      alignItems: 'center',
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    probableName: { ...type.body, color: c.label },
    probableDegree: { ...type.caption, color: c.secondary, marginTop: 2 },
    actions: { paddingHorizontal: space.lg, marginTop: space.md },
  });
