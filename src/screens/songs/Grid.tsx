import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { sectionLabel } from '../../i18n';
import { Section } from '../../songs/model';
import { useSettings } from '../../state/settings';
import { Theme, useStyles } from '../../theme';
import { Mode, nashvilleLabel, nashvilleToChord } from '../../theory/nashville';

/**
 * Une grille affichée, section par section.
 *
 * Deux écritures pour la même chose : les accords, qu'on joue, et le chiffrage
 * Nashville, qu'on lit quand on veut transposer de tête. La mesure illisible n'est
 * pas cachée : elle s'affiche barrée, telle qu'elle a été saisie — une mesure qui
 * disparaît de la grille serait pire qu'une mesure qu'on ne sait pas lire.
 */
export function Grid({
  sections,
  songKey,
  mode,
  view,
}: {
  sections: Section[];
  songKey: number;
  mode: Mode;
  view: 'chords' | 'nashville';
}) {
  const { t, notation } = useSettings();
  const s = useStyles(makeStyles);

  return (
    <View>
      {sections.map((section, index) => (
        <View key={`${section.name}-${index}`} style={s.section}>
          <Text style={s.sectionName}>{sectionLabel(section.name, t)}</Text>
          <View style={s.bars}>
            {section.bars.map((bar, i) => {
              const chord = nashvilleToChord(bar, songKey, mode);
              return (
                <View key={`${bar}-${i}`} style={s.bar}>
                  <Text style={[s.chord, !chord && s.unreadable]}>
                    {chord ? (view === 'chords' ? nashvilleLabel(chord, songKey, mode, notation) : bar) : bar}
                  </Text>
                  {chord && view === 'chords' ? <Text style={s.degree}>{bar}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {sections.some((section) => section.bars.some((bar) => !nashvilleToChord(bar, songKey, mode))) ? (
        <Text style={s.note}>{t.worship.unreadableBar}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    section: { marginBottom: space.lg },
    sectionName: { ...type.caption, color: c.secondary, textTransform: 'uppercase', letterSpacing: 1 },
    bars: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.xs },
    bar: {
      minWidth: 58,
      paddingVertical: space.xs,
      paddingHorizontal: space.sm,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      marginRight: space.sm,
      marginBottom: space.sm,
      alignItems: 'center',
    },
    chord: { ...type.body, color: c.label },
    degree: { ...type.caption, color: c.secondary, marginTop: 2 },
    unreadable: { color: c.secondary, textDecorationLine: 'line-through' },
    note: { ...type.caption, color: c.secondary },
  });
