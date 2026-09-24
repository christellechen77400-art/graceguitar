import { useKeepAwake } from 'expo-keep-awake';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHideTabBar } from '../navigation';
import { setSourceLabel, songLine } from '../songs/labels';
import { Song, WorshipSet } from '../songs/model';
import { useSettings } from '../state/settings';
import { tabularNums, Theme, useStyles } from '../theme';
import { nashvilleLabel } from '../theory/nashville';
import { mod12, noteName, prefersFlats } from '../theory/notes';
import { probableChords } from '../theory/worship';
import { Grid } from './songs/Grid';

/**
 * Le mode dimanche : un chant, en grand, sur le pupitre.
 *
 * Rien à toucher, rien à régler : la tonalité, le capo, les formes, et la grille.
 * Le texte est plus grand que partout ailleurs et l'écran ne s'éteint pas — on a
 * les deux mains sur la guitare.
 *
 * La grille est montrée en accords et jamais en chiffres : le dimanche, on joue ce
 * qu'on a sous les yeux. Le chiffrage reste sur la fiche du chant, dans Louange.
 */
export function SongStage({
  song,
  set,
  key,
  capo,
  onClose,
}: {
  song: Song;
  /** Le set d'où vient le chant, pour en dire la source. */
  set: WorshipSet;
  key: number;
  capo: number;
  onClose: () => void;
}) {
  const { t, notation } = useSettings();
  const s = useStyles(makeStyles);
  useHideTabBar(true);
  // L'écran reste allumé tant que la fiche est ouverte, et se rendort après.
  useKeepAwake();

  const sections = song.sections ?? [];
  const shapes = mod12(key - capo);

  return (
    <View style={s.root}>
      <View style={s.bar}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t.close} style={s.quit}>
          <Text style={s.quitText}>✕</Text>
        </Pressable>
        <Text style={s.origin} numberOfLines={1}>
          {setSourceLabel(set, t)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title} accessibilityRole="header">
          {song.title}
        </Text>
        <Text style={s.line}>
          {songLine(key, capo, notation, t)} · {t.worship.shapes} {noteName(shapes, notation, prefersFlats(key))}
        </Text>

        {sections.length ? (
          <View style={s.grid}>
            <Grid sections={sections} songKey={key} mode={song.mode} view="chords" large />
          </View>
        ) : (
          <>
            <Text style={s.line}>{t.worship.probable}</Text>
            <View style={s.probable}>
              {probableChords(key, song.mode).map(({ nashville, chord }) => (
                <View key={nashville} style={s.probableChip}>
                  <Text style={s.probableName}>{nashvilleLabel(chord, key, song.mode, notation)}</Text>
                  <Text style={s.probableDegree}>{nashville}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={s.hint}>{t.worship.keepAwake}</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md },
    quit: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
    quitText: { ...type.section, color: c.label },
    origin: { ...type.caption, color: c.secondary, flex: 1, marginLeft: space.sm },
    content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xl },
    title: { ...type.chordName, color: c.label },
    line: { ...type.subhead, ...tabularNums, color: c.secondary, marginTop: space.xs },
    grid: { marginTop: space.lg },
    probable: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md },
    probableChip: {
      minWidth: 72,
      alignItems: 'center',
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: radius.chip,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    probableName: { ...type.section, color: c.label },
    probableDegree: { ...type.caption, color: c.secondary, marginTop: 2 },
    hint: { ...type.caption, color: c.secondary, marginTop: space.xl },
  });
