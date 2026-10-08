import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { HelpLink } from '../components/guideBits';
import { Chip, ChipRow, KeyPicker, PrimaryButton, SecondaryButton, SectionHeader, Sheet, useTextStyles } from '../components/ui';
import {
  chordsOfSong,
  EnteredChord,
  parseChordText,
  songFromChords,
  toBars,
} from '../songs/chordInput';
import { Song } from '../songs/model';
import { useSongs } from '../songs/store';
import { useSettings } from '../state/settings';
import { Theme, useStyles, useTheme } from '../theme';
import { chordById, chordName } from '../theory/chords';
import { chordToNashville } from '../theory/nashville';
import { mod12, prefersFlats } from '../theory/notes';
import { DIATONIC } from '../theory/worship';

/**
 * La saisie des accords d'un chant.
 *
 * On tape (ou on colle) les accords dans l'ordre, on les corrige d'une touche, et
 * « Proposer les triades » enregistre le chant sur l'appareil puis ouvre
 * l'enchaînement. Rien ne part nulle part : la saisie reste sur ce téléphone.
 */
export function ChordEntrySheet({
  visible,
  song,
  onClose,
  onDone,
}: {
  visible: boolean;
  /** Le chant à corriger, ou null pour un nouveau. */
  song: Song | null;
  onClose: () => void;
  /** Appelé avec le chant enregistré, une fois « Proposer les triades » touché. */
  onDone: (song: Song) => void;
}) {
  const { settings, notation, t } = useSettings();
  const store = useSongs();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const { c } = useTheme();

  const [title, setTitle] = useState(song?.title ?? '');
  const [key, setKey] = useState(song?.defaultKey ?? settings.keyRoot);
  const [capo, setCapo] = useState(song?.capo ?? 0);
  const [chords, setChords] = useState<EnteredChord[]>(song ? chordsOfSong(song) : []);
  const [text, setText] = useState('');
  const [unreadable, setUnreadable] = useState<string[]>([]);

  const flats = prefersFlats(key);
  const nameOf = (chord: EnteredChord) => chordName(chord.root, chordById(chord.chord), notation, flats);
  const degreeOf = (chord: EnteredChord) => chordToNashville({ root: chord.root, chord: chord.chord, bass: null }, key, 'major');

  const palette = useMemo(
    () => DIATONIC.map((d) => ({ root: mod12(key + d.degree), chord: d.type, playable: d.type !== 'dim' })),
    [key],
  );

  const add = () => {
    const parsed = parseChordText(text);
    if (parsed.chords.length) setChords((current) => [...current, ...parsed.chords]);
    setUnreadable(parsed.unreadable);
    // Ce qui n'a pas pu être lu reste dans le champ, pour être corrigé.
    setText(parsed.unreadable.join(' '));
  };

  const propose = () => {
    const bars = toBars(chords, key);
    const name = title.trim() || t.triads.untitled;
    if (song) {
      const next = {
        title: name,
        defaultKey: key,
        capo,
        sections: [{ name: 'verse', bars }],
        updatedAt: new Date().toISOString(),
      };
      store.updateSong(song.id, next);
      onDone({ ...song, ...next });
    } else {
      const created = { ...songFromChords(name, key, chords), capo };
      store.addSong(created);
      onDone(created);
    }
  };

  return (
    <Sheet
      visible={visible}
      title={t.entry.title}
      onClose={onClose}
      closeLabel={t.cancel}
      footer={<PrimaryButton label={t.entry.suggest} disabled={!chords.length} onPress={propose} />}
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t.entry.songTitle}
        placeholderTextColor={c.secondary}
        style={s.input}
        accessibilityLabel={t.entry.songTitle}
      />

      <KeyPicker label={t.entry.key} value={key} onChange={setKey} />

      {settings.guitar === 'acoustic' ? (
        <>
          <SectionHeader>{t.entry.capo}</SectionHeader>
          <ChipRow>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Chip key={n} label={n === 0 ? t.entry.capoNone : String(n)} selected={capo === n} onPress={() => setCapo(n)} />
            ))}
          </ChipRow>
        </>
      ) : null}

      <SectionHeader>{t.entry.inOrder}</SectionHeader>
      {chords.length ? (
        <ChipRow>
          {chords.map((chord, index) => (
            <Chip
              key={`${index}-${chord.root}-${chord.chord}`}
              label={`${nameOf(chord)} · ${degreeOf(chord)}  ✕`}
              onPress={() => setChords((current) => current.filter((_, i) => i !== index))}
              accessibilityLabel={t.entry.removeChord(nameOf(chord))}
            />
          ))}
        </ChipRow>
      ) : (
        <Text style={ui.hint}>{t.entry.empty}</Text>
      )}

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t.entry.typeHere}
        placeholderTextColor={c.secondary}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        onSubmitEditing={add}
        style={[s.input, s.multiline]}
        accessibilityLabel={t.entry.paste}
      />
      <Text style={ui.hint}>{t.entry.pasteHint}</Text>
      {unreadable.length ? <Text style={s.warning}>{t.entry.unreadable(unreadable.join(', '))}</Text> : null}
      <View style={s.addRow}>
        <SecondaryButton label={t.entry.add} disabled={!text.trim()} onPress={add} />
      </View>

      <SectionHeader>{t.entry.palette}</SectionHeader>
      <ChipRow>
        {palette.map((p) => (
          <Chip
            key={`${p.root}-${p.chord}`}
            label={chordName(p.root, chordById(p.chord), notation, flats)}
            disabled={!p.playable}
            onPress={() => setChords((current) => [...current, { root: p.root, chord: p.chord }])}
          />
        ))}
      </ChipRow>
      <Text style={ui.hint}>{t.entry.dimNotHandled}</Text>

      <HelpLink screen="manche.triades.saisie" tab="neck" originLabel={t.layers.triads} layer="triads" />
    </Sheet>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    input: {
      ...type.body,
      color: c.label,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      borderRadius: radius.chip,
      paddingHorizontal: space.md,
      marginHorizontal: space.lg,
      marginTop: space.lg,
      minHeight: size.touch,
    },
    multiline: { minHeight: 72, paddingTop: space.sm, textAlignVertical: 'top' },
    warning: { ...type.caption, color: c.destructive, paddingHorizontal: space.lg, marginTop: space.sm },
    addRow: { marginHorizontal: space.lg, marginTop: space.md },
  });
