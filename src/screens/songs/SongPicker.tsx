import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, ChipRow, ListRow, PrimaryButton, SectionHeader, Segmented, Sheet, Stepper, useTextStyles } from '../../components/ui';
import { emptySong, Song } from '../../songs/model';
import { searchSongs } from '../../songs/library';
import { useSongs } from '../../songs/store';
import { useSettings } from '../../state/settings';
import { Theme, useStyles, useTheme } from '../../theme';
import { mod12, noteName, prefersFlats } from '../../theory/notes';
import { suggestCapo } from '../../theory/worship';

/**
 * Ajouter un chant à un set.
 *
 * On cherche d'abord : dès les premières lettres, la bibliothèque propose, et un
 * toucher ajoute le chant avec sa tonalité habituelle — le cas courant est de
 * reprendre un chant qu'on connaît déjà.
 *
 * Quand le titre ne répond à rien, la saisie éclair prend le relais sous la
 * recherche, avec le titre déjà écrit. La tonalité et le mode se touchent, le capo
 * conseillé s'affiche tout de suite et reste modifiable : c'est la seule décision
 * qu'on ne peut pas remettre à plus tard, puisque c'est ce qu'on jouera.
 */
export function SongPicker({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  /** Le chant créé ou choisi, et le capo à retenir pour ce set. */
  onAdd: (song: Song, capo: number) => void;
}) {
  const { t, notation, settings } = useSettings();
  const { songs } = useSongs();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [query, setQuery] = useState('');
  const [key, setKey] = useState(settings.keyRoot);
  const [mode, setMode] = useState<'major' | 'minor'>('major');
  const [capo, setCapo] = useState<number | null>(null);

  const title = query.trim();
  const results = title ? searchSongs(songs, title) : [];
  const exact = results.find((song) => song.title.toLowerCase() === title.toLowerCase());
  // The capo follows the key until it is touched: a suggestion that stops
  // suggesting the moment you change the key would be worse than none.
  const suggested = capo ?? suggestCapo(key, settings.preferredShapes);

  const reset = () => {
    setQuery('');
    setCapo(null);
    setMode('major');
  };

  const create = () => {
    if (!title) return;
    onAdd(emptySong(title, key, mode), suggested);
    reset();
  };

  return (
    <Sheet visible={visible} title={t.sets.addSong} onClose={onClose}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.worship.searchSong}
        placeholderTextColor={c.secondary}
        autoCorrect={false}
        style={s.input}
        accessibilityLabel={t.worship.searchSong}
      />
      <Text style={ui.hint}>{t.worship.searchHint}</Text>

      {results.map((song, i) => (
        <ListRow
          key={song.id}
          title={song.title}
          subtitle={`${t.key} ${noteName(song.defaultKey, notation, prefersFlats(song.defaultKey))}`}
          onPress={() => {
            onAdd(song, suggestCapo(song.defaultKey, settings.preferredShapes));
            reset();
          }}
          last={i === results.length - 1}
        />
      ))}
      {title && !results.length ? <Text style={ui.hint}>{t.worship.noResult}</Text> : null}

      {title && !exact ? (
        <>
          <SectionHeader>{t.worship.quickAdd}</SectionHeader>
          <Card style={s.card}>
            <Text style={s.draftTitle}>{title}</Text>
            <ChipRow>
              {Array.from({ length: 12 }, (_, pc) => (
                <Chip
                  key={pc}
                  label={noteName(pc, notation, prefersFlats(pc))}
                  selected={pc === key}
                  onPress={() => setKey(pc)}
                />
              ))}
            </ChipRow>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'major', label: t.worship.mode.major },
                { value: 'minor', label: t.worship.mode.minor },
              ]}
            />
            <Stepper
              label={t.sets.capo}
              value={suggested}
              onChange={setCapo}
              min={0}
              max={11}
              format={(value) => (value === 0 ? t.worship.noCapo : String(value))}
            />
            <Text style={ui.hint}>
              {t.worship.shapes} : {noteName(mod12(key - suggested), notation, prefersFlats(key))}
            </Text>
            <View style={s.create}>
              <PrimaryButton label={t.worship.create} onPress={create} disabled={!title} />
            </View>
          </Card>
        </>
      ) : null}
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
      paddingVertical: space.sm,
      marginHorizontal: space.lg,
      minHeight: size.touch,
    },
    card: { marginTop: space.sm },
    draftTitle: { ...type.cardTitle, color: c.label, marginBottom: space.sm },
    create: { marginTop: space.md },
  });
