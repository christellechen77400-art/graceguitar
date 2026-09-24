import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ListRow, PrimaryButton, SectionHeader, Sheet, useTextStyles } from '../../components/ui';
import { formatDay } from '../../i18n';
import { newId } from '../../songs/model';
import { adoptShared, readSharedLink, SharedSet, SHARE_PREFIX } from '../../songs/share';
import { useSongs } from '../../songs/store';
import { useSettings } from '../../state/settings';
import { Theme, useStyles, useTheme } from '../../theme';
import { noteName, prefersFlats } from '../../theory/notes';

/**
 * Un set reçu.
 *
 * Deux entrées pour la même chose : un lien ouvert par l'app, et un lien collé à
 * la main. Le second n'est pas un pis-aller — sous Expo Go, le schéma
 * `graceguitar://` n'est pas enregistré, et coller est alors le seul chemin.
 *
 * L'aperçu dit exactement ce qui sera ajouté : la date, le nom du culte, qui l'a
 * envoyé, et les chants avec leur tonalité. Rien n'est écrit avant « Ajouter à mes
 * sets ».
 */
export function ImportSet({
  incoming,
  visible,
  onClose,
  onDone,
}: {
  /** Le set lu depuis un lien ouvert par l'app, s'il y en a un. */
  incoming: SharedSet | null;
  visible: boolean;
  onClose: () => void;
  /** Le set a été ajouté : l'app peut le montrer. */
  onDone: (setId: string) => void;
}) {
  const { t, notation } = useSettings();
  const { songs, adoptSet } = useSongs();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [pasted, setPasted] = useState('');
  const [bad, setBad] = useState(false);

  const shared = incoming ?? readSharedLink(pasted);
  if (!visible) return null;

  const read = () => {
    if (readSharedLink(pasted)) setBad(false);
    else setBad(true);
  };

  const adopt = () => {
    if (!shared) return;
    const { songs: touched, set } = adoptShared(shared, songs, 'shared', newId);
    adoptSet(touched, set);
    setPasted('');
    onDone(set.id);
  };

  return (
    <Sheet
      visible={visible}
      title={t.worship.importSet}
      onClose={onClose}
      footer={
        shared ? (
          <PrimaryButton label={t.worship.addToMySets} onPress={adopt} />
        ) : (
          <PrimaryButton label={t.worship.readLink} onPress={read} disabled={!pasted.trim()} />
        )
      }
    >
      {shared ? (
        <>
          <SectionHeader>{formatDay(shared.d, t)}</SectionHeader>
          <Text style={ui.hint}>
            {shared.n ?? t.sets.untitled}
            {shared.f ? ` · ${t.worship.from(shared.f)}` : ''}
          </Text>
          <Text style={ui.hint}>{t.worship.importHint(shared.songs.length)}</Text>
          {shared.songs.map((song, i) => (
            <ListRow
              key={`${song.t}-${i}`}
              title={song.t}
              subtitle={`${t.key} ${noteName(song.k, notation, prefersFlats(song.k))}${
                song.c ? ` · ${t.sets.capo} ${song.c}` : ''
              }`}
              value={song.s ? t.worship.grid : t.worship.keyOnly}
              last={i === shared.songs.length - 1}
            />
          ))}
        </>
      ) : (
        <>
          <Text style={ui.hint}>{t.worship.shareHint}</Text>
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={`${SHARE_PREFIX}…`}
            placeholderTextColor={c.secondary}
            style={[s.input, s.text]}
            accessibilityLabel={t.worship.importSet}
          />
          {bad ? <Text style={ui.hint}>{t.worship.badLink}</Text> : null}
        </>
      )}
    </Sheet>
  );
}

const makeStyles = ({ c, type, space, radius }: Theme) =>
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
    },
    text: { minHeight: 110, textAlignVertical: 'top' },
  });
