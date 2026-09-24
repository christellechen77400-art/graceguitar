import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip, ChipRow, PrimaryButton, SecondaryButton, SectionHeader, Sheet, useTextStyles } from '../../components/ui';
import { formatDay } from '../../i18n';
import { songLine } from '../../songs/labels';
import { nextSundays, setSongs, Song, WorshipSet } from '../../songs/model';
import { useSongs } from '../../songs/store';
import { useSettings } from '../../state/settings';
import { Theme, useStyles, useTheme } from '../../theme';
import { SongPicker } from './SongPicker';

/**
 * Un set : sa date, son nom, et ses chants dans l'ordre.
 *
 * La date est une pastille parmi les prochains dimanches plutôt qu'un champ à
 * remplir : un set se date un dimanche, et on ne gagne rien à laisser écrire
 * « 27/09 » ou « 2026-9-27 ».
 *
 * L'ordre est celui qu'on jouera. Il se change avec des flèches : le glisser-déposer
 * demanderait une bibliothèque de plus, et deux flèches font le même travail sans
 * rien installer.
 */
export function SetSheet({
  set,
  visible,
  onClose,
  onOpenSong,
  onShare,
}: {
  set: WorshipSet | null;
  visible: boolean;
  onClose: () => void;
  /** Ouvre la fiche d'un chant du set. */
  onOpenSong: (song: Song) => void;
  onShare: () => void;
}) {
  const { t, notation } = useSettings();
  const { songs, updateSet, removeSet, addToSet, removeFromSet, moveInSet } = useSongs();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [picking, setPicking] = useState(false);

  if (!set) return null;

  const list = setSongs(set, songs);
  const sundays = nextSundays(4);
  // A set dated outside the coming month keeps its own date at the head of the
  // list: a chip row that does not contain the current value reads as a bug.
  const dates = sundays.includes(set.date) ? sundays : [set.date, ...sundays];

  return (
    <>
      <Sheet
        visible={visible}
        title={set.serviceName || t.sets.untitled}
        onClose={onClose}
        closeLabel={t.close}
        footer={
          <View style={s.footer}>
            <PrimaryButton label={t.sets.addSong} onPress={() => setPicking(true)} />
            {list.length ? (
              <SecondaryButton label={t.worship.share} onPress={onShare} style={s.footerAction} />
            ) : null}
          </View>
        }
      >
        <SectionHeader>{t.sets.date}</SectionHeader>
        <ChipRow>
          {dates.map((date) => (
            <Chip
              key={date}
              label={formatDay(date, t)}
              selected={date === set.date}
              onPress={() => updateSet(set.id, { date })}
            />
          ))}
        </ChipRow>

        <TextInput
          value={set.serviceName ?? ''}
          onChangeText={(serviceName) => updateSet(set.id, { serviceName: serviceName.trim() || undefined })}
          placeholder={t.sets.setTitle}
          placeholderTextColor={c.secondary}
          style={s.input}
          accessibilityLabel={t.sets.setTitle}
        />
        <Text style={ui.hint}>{t.sets.setTitleHint}</Text>

        <SectionHeader>{t.worship.songCount(list.length)}</SectionHeader>
        {!list.length ? <Text style={ui.hint}>{t.sets.noSongs}</Text> : null}
        {list.map(({ song, entry }, i) => (
          <View key={song.id} style={s.song}>
            <Pressable
              onPress={() => onOpenSong(song)}
              accessibilityRole="button"
              accessibilityLabel={`${song.title}, ${songLine(entry.key, entry.capo, notation, t)}`}
              style={s.songText}
            >
              <Text style={s.songTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={ui.hint}>{songLine(entry.key, entry.capo, notation, t)}</Text>
            </Pressable>
            <Pressable
              onPress={() => moveInSet(set.id, song.id, -1)}
              disabled={i === 0}
              accessibilityRole="button"
              accessibilityLabel={t.sets.moveUp}
              style={[s.icon, i === 0 && s.disabled]}
            >
              <Text style={s.iconText}>↑</Text>
            </Pressable>
            <Pressable
              onPress={() => moveInSet(set.id, song.id, 1)}
              disabled={i === list.length - 1}
              accessibilityRole="button"
              accessibilityLabel={t.sets.moveDown}
              style={[s.icon, i === list.length - 1 && s.disabled]}
            >
              <Text style={s.iconText}>↓</Text>
            </Pressable>
            <Pressable
              onPress={() => removeFromSet(set.id, song.id)}
              accessibilityRole="button"
              accessibilityLabel={t.sets.remove}
              style={s.icon}
            >
              <Text style={s.iconText}>✕</Text>
            </Pressable>
          </View>
        ))}

        <View style={s.actions}>
          <SecondaryButton
            label={t.sets.delete}
            onPress={() => {
              removeSet(set.id);
              onClose();
            }}
          />
        </View>
      </Sheet>

      <SongPicker
        visible={picking}
        onClose={() => setPicking(false)}
        onAdd={(song, capo) => {
          addToSet(set.id, song.id, capo);
          setPicking(false);
        }}
      />
    </>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
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
      marginTop: space.md,
      minHeight: size.touch,
    },
    song: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, minHeight: size.rowTwoLine },
    songText: { flex: 1 },
    songTitle: { ...type.body, color: c.label },
    icon: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
    iconText: { ...type.body, color: c.secondary },
    disabled: { opacity: 0.3 },
    actions: { paddingHorizontal: space.lg, marginTop: space.lg },
    footer: { paddingBottom: space.sm },
    footerAction: { marginTop: space.sm },
  });
