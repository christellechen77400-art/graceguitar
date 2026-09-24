import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip, ChipRow, SectionHeader, useTextStyles } from '../components/ui';
import { Question, setChordRun } from '../practice/engine';
import { emptySong, setChords, setSongs, Song, SongSet } from '../songs/model';
import { SET_SOURCES } from '../songs/sources';
import { useSongs } from '../songs/store';
import { useSettings } from '../state/settings';
import { Theme, useStyles, useTheme } from '../theme';
import { parseChordPro } from '../theory/chordpro';
import { noteName } from '../theory/notes';
import { RunScreen } from './Run';

/**
 * The songs for the coming Sunday, and a way to practise them.
 *
 * Songs are typed in or pasted as ChordPro. The two team sources below are listed
 * but not wired up: they are shown greyed out on purpose, so it is clear where the
 * sets will come from rather than the feature appearing to be missing.
 */
export function SetsPanel() {
  const { t, notation } = useSettings();
  const songs = useSongs();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [openSet, setOpenSet] = useState<string | null>(null);
  const [run, setRun] = useState<Question[] | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [newSong, setNewSong] = useState<{ setId: string; title: string; chart: string } | null>(null);

  if (run) return <RunScreen questions={run} onExit={() => setRun(null)} />;

  const addSongToSet = (set: SongSet) => {
    const title = newSong?.title.trim();
    if (!newSong || !title) return;
    const song = newSong.chart.trim()
      ? songs.addFromChordPro(newSong.chart, title)
      : emptySong(title);
    songs.addToSet(set.id, song.id);
    setNewSong(null);
  };

  return (
    <View>
      <Text style={s.title}>{t.sets.title}</Text>
      <Text style={ui.hint}>{t.sets.hint}</Text>

      {!songs.sets.length && <Text style={ui.hint}>{t.sets.empty}</Text>}

      {songs.sets.map((set) => {
        const list = setSongs(set, songs.songs);
        const open = openSet === set.id;
        return (
          <React.Fragment key={set.id}>
            <SectionHeader>{set.title || t.sets.untitled}</SectionHeader>
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
                {list.map((song, i) => (
                  <View key={song.id} style={s.song}>
                    <View style={s.songText}>
                      <Text style={s.songTitle}>{song.title}</Text>
                      <Text style={ui.hint}>{songLine(song, notation, t.sets.key, t.sets.capo)}</Text>
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

                {list.some((song) => parseChordPro(song.chordPro).unknown.length > 0) && (
                  <Text style={ui.hint}>
                    {t.sets.unknownChords(
                      Array.from(
                        new Set(list.flatMap((song) => parseChordPro(song.chordPro).unknown)),
                      ).join(', '),
                    )}
                  </Text>
                )}
              </View>
            )}
          </React.Fragment>
        );
      })}

      <SectionHeader>{t.sets.newSet}</SectionHeader>
      <TextInput
        value={draftTitle}
        onChangeText={setDraftTitle}
        placeholder={t.sets.setTitle}
        placeholderTextColor={c.secondary}
        style={s.input}
        accessibilityLabel={t.sets.setTitle}
      />
      <ChipRow>
        <Chip
          label={t.sets.newSet}
          onPress={() => {
            // The date defaults to the coming Sunday, which is what a set is for.
            const set = songs.createSet(draftTitle.trim() || t.sets.untitled);
            setDraftTitle('');
            setOpenSet(set.id);
          }}
        />
      </ChipRow>

      <SectionHeader>{t.sets.sources}</SectionHeader>
      <Text style={ui.hint}>{t.sets.sourceHint}</Text>
      {SET_SOURCES.filter((source) => source.id !== 'manual').map((source) => (
        <View key={source.id} style={s.row}>
          <Text style={[s.rowLabel, !source.available && s.muted]}>{t.sets.source[source.id]}</Text>
          {!source.available && <Text style={s.badge}>{t.sets.comingSoon}</Text>}
        </View>
      ))}
    </View>
  );
}

/** "G · capo 2", or nothing when the song does not say. */
function songLine(song: Song, notation: 'anglo' | 'latin', keyLabel: string, capoLabel: string): string {
  const parts: string[] = [];
  if (song.key !== null) parts.push(`${keyLabel} ${noteName(song.key, notation, false)}`);
  if (song.capo) parts.push(`${capoLabel} ${song.capo}`);
  const parsed = parseChordPro(song.chordPro);
  if (!parts.length && parsed.chords.length) {
    parts.push(parsed.chords.slice(0, 4).map((c) => noteName(c.root, notation, false)).join(' '));
  }
  return parts.join(' · ');
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    title: { ...type.greeting, color: c.label, paddingHorizontal: space.lg, marginTop: space.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: size.row,
      paddingHorizontal: space.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    rowLabel: { ...type.body, color: c.label, flex: 1 },
    muted: { color: c.secondary },
    badge: { ...type.caption, color: c.secondary, fontWeight: '600' },
    chevron: { ...type.section, color: c.secondary },
    song: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: size.row },
    songText: { flex: 1 },
    songTitle: { ...type.body, color: c.label },
    icon: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
    iconText: { ...type.body, color: c.secondary },
    disabled: { opacity: 0.3 },
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
