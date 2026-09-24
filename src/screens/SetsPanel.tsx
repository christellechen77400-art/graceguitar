import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip, ChipRow, ListRow, SectionHeader, useTextStyles } from '../components/ui';
import { Question, setChordRun } from '../practice/engine';
import { songFromChordPro } from '../songs/import';
import { emptySong, setChords, setSongs, WorshipSet } from '../songs/model';
import { SET_SOURCES } from '../songs/sources';
import { useSongs } from '../songs/store';
import { useSettings } from '../state/settings';
import { Theme, useStyles, useTheme } from '../theme';
import { noteName, prefersFlats } from '../theory/notes';
import { RunScreen } from './Run';

/**
 * Les chants du prochain dimanche, et de quoi les travailler.
 *
 * Un chant s'écrit à la main ou se colle en ChordPro. Les deux sources d'équipe
 * sont annoncées, pas proposées : une ligne grisée et son sous-titre disent
 * « prévu » sans promettre un badge coloré que rien ne viendrait remplir.
 *
 * La fiche d'un chant, la saisie de la grille et le partage d'un set arrivent avec
 * l'onglet Louange ; ici on garde le minimum qui tient debout tout seul.
 */
export function SetsPanel() {
  const { t, notation } = useSettings();
  const songs = useSongs();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [openSet, setOpenSet] = useState<string | null>(null);
  const [run, setRun] = useState<Question[] | null>(null);
  const [draft, setDraft] = useState({ date: '', name: '' });
  const [newSong, setNewSong] = useState<{ setId: string; title: string; chart: string } | null>(null);

  if (run) return <RunScreen questions={run} onExit={() => setRun(null)} />;

  const addSongToSet = (set: WorshipSet) => {
    const title = newSong?.title.trim();
    if (!newSong || !title) return;
    const song = newSong.chart.trim()
      ? songFromChordPro(newSong.chart, title)
      : emptySong(title, 0);
    songs.addSong(song);
    songs.addToSet(set.id, song.id);
    setNewSong(null);
  };

  return (
    <View>
      <SectionHeader>{t.sets.title}</SectionHeader>
      <Text style={ui.hint}>{t.sets.hint}</Text>

      {!songs.sets.length && <Text style={ui.hint}>{t.sets.empty}</Text>}

      {songs.sets.map((set) => {
        const list = setSongs(set, songs.songs);
        const open = openSet === set.id;
        return (
          <React.Fragment key={set.id}>
            <SectionHeader>{set.serviceName || t.sets.untitled}</SectionHeader>
            <Text style={ui.hint}>
              {set.date} · {t.sets.songCount(list.length)}
            </Text>

            <Pressable
              onPress={() => setOpenSet(open ? null : set.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={s.row}
            >
              <Text style={s.rowLabel}>{open ? t.close : t.sets.songs}</Text>
              <Text style={s.chevron}>{open ? '⌄' : '›'}</Text>
            </Pressable>

            {open && (
              <View>
                {!list.length && <Text style={ui.hint}>{t.sets.noSongs}</Text>}
                {list.map(({ song, entry }, i) => (
                  <View key={song.id} style={s.song}>
                    <View style={s.songText}>
                      <Text style={s.songTitle}>{song.title}</Text>
                      <Text style={ui.hint}>
                        {songLine(
                          entry.key,
                          entry.capo,
                          notation,
                          prefersFlats(entry.key),
                          t.sets.key,
                          t.sets.capo,
                        )}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => songs.moveInSet(set.id, song.id, -1)}
                      disabled={i === 0}
                      accessibilityRole="button"
                      accessibilityLabel={t.sets.moveUp}
                      style={[s.icon, i === 0 && s.disabled]}
                    >
                      <Text style={s.iconText}>↑</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => songs.moveInSet(set.id, song.id, 1)}
                      disabled={i === list.length - 1}
                      accessibilityRole="button"
                      accessibilityLabel={t.sets.moveDown}
                      style={[s.icon, i === list.length - 1 && s.disabled]}
                    >
                      <Text style={s.iconText}>↓</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => songs.removeFromSet(set.id, song.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t.sets.remove}
                      style={s.icon}
                    >
                      <Text style={s.iconText}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                {newSong?.setId === set.id ? (
                  <View>
                    <TextInput
                      value={newSong.title}
                      onChangeText={(title) => setNewSong({ ...newSong, title })}
                      placeholder={t.sets.songTitle}
                      placeholderTextColor={c.secondary}
                      style={s.input}
                      accessibilityLabel={t.sets.songTitle}
                    />
                    <TextInput
                      value={newSong.chart}
                      onChangeText={(chart) => setNewSong({ ...newSong, chart })}
                      placeholder={t.sets.importHint}
                      placeholderTextColor={c.secondary}
                      multiline
                      style={[s.input, s.chart]}
                      accessibilityLabel={t.sets.importHint}
                    />
                    <ChipRow>
                      <Chip label={t.sets.addSong} onPress={() => addSongToSet(set)} />
                      <Chip label={t.sets.cancel} onPress={() => setNewSong(null)} />
                    </ChipRow>
                  </View>
                ) : (
                  <ChipRow>
                    <Chip
                      label={t.sets.addSong}
                      onPress={() => setNewSong({ setId: set.id, title: '', chart: '' })}
                    />
                    {list.length > 0 && (
                      <Chip
                        label={t.sets.practice}
                        onPress={() => {
                          const chords = setChords(set, songs.songs);
                          if (chords.length) setRun(setChordRun(chords));
                        }}
                      />
                    )}
                    <Chip label={t.sets.delete} onPress={() => songs.removeSet(set.id)} />
                  </ChipRow>
                )}
              </View>
            )}
          </React.Fragment>
        );
      })}

      <SectionHeader>{t.sets.newSet}</SectionHeader>
      <View style={s.form}>
        <TextInput
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          placeholder={t.sets.setTitle}
          placeholderTextColor={c.secondary}
          style={s.input}
          accessibilityLabel={t.sets.setTitle}
        />
        <TextInput
          value={draft.date}
          onChangeText={(date) => setDraft({ ...draft, date })}
          placeholder={t.sets.date}
          placeholderTextColor={c.secondary}
          autoCapitalize="none"
          style={s.input}
          accessibilityLabel={t.sets.date}
        />
      </View>
      <ChipRow>
        <Chip
          label={t.sets.newSet}
          onPress={() => {
            // The date defaults to the coming Sunday, which is what a set is for.
            const set = songs.createSet(draft.date.trim() || undefined, draft.name.trim() || undefined);
            setDraft({ date: '', name: '' });
            setOpenSet(set.id);
          }}
        />
      </ChipRow>

      <SectionHeader>{t.sets.sources}</SectionHeader>
      <Text style={ui.hint}>{t.sets.sourceHint}</Text>
      {/* Les sources d'équipe sont annoncées, pas proposées : une ligne grisée et
          son sous-titre disent « prévu » sans promettre un badge coloré que rien
          ne viendrait remplir. */}
      {SET_SOURCES.filter((source) => source.id !== 'manual').map((source, i, all) => (
        <ListRow
          key={source.id}
          title={t.sets.source[source.id]}
          subtitle={source.available ? undefined : t.sets.comingSoon}
          muted={!source.available}
          last={i === all.length - 1}
        />
      ))}
    </View>
  );
}

/** « Sol · capo 2 », ou rien quand le set ne dit ni tonalité ni capo. */
function songLine(
  key: number,
  capo: number,
  notation: 'anglo' | 'latin',
  flats: boolean,
  keyLabel: string,
  capoLabel: string,
): string {
  const parts = [`${keyLabel} ${noteName(key, notation, flats)}`];
  if (capo) parts.push(`${capoLabel} ${capo}`);
  return parts.join(' · ');
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: size.row,
      paddingHorizontal: space.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    rowLabel: { ...type.body, color: c.label, flex: 1 },
    chevron: { ...type.section, color: c.secondary },
    song: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: size.row },
    songText: { flex: 1 },
    songTitle: { ...type.body, color: c.label },
    icon: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
    iconText: { ...type.body, color: c.secondary },
    disabled: { opacity: 0.3 },
    form: { marginBottom: space.sm },
    input: {
      ...type.subhead,
      color: c.label,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      borderRadius: radius.chip,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      marginHorizontal: space.lg,
      marginBottom: space.sm,
      minHeight: size.touch,
    },
    chart: { minHeight: 120, textAlignVertical: 'top' },
  });
