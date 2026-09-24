import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ChipRow, Chip, ListRow, PrimaryButton, SectionHeader, Sheet, useTextStyles } from '../../components/ui';
import { sectionLabel } from '../../i18n';
import { previewChordPro } from '../../songs/import';
import { useSettings } from '../../state/settings';
import { Theme, useStyles, useTheme } from '../../theme';
import { noteName, prefersFlats } from '../../theory/notes';

/**
 * Coller une grille ChordPro.
 *
 * On montre ce qui a été reconnu avant d'enregistrer : le titre, la tonalité, les
 * sections, et les accords qu'on n'a pas su lire. Enregistrer à l'aveugle un texte
 * qu'on vient de coller, c'est découvrir à la répétition que la grille est vide.
 *
 * La tonalité n'est annoncée que si la grille en donne une, par un `{key}` ou par
 * ses accords ; sinon l'écran dit qu'il n'en sait rien plutôt que d'en inventer une.
 */
export function PasteChart({
  visible,
  onClose,
  onImport,
}: {
  visible: boolean;
  onClose: () => void;
  onImport: (text: string) => void;
}) {
  const { t, notation } = useSettings();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [text, setText] = useState('');

  const preview = previewChordPro(text);
  const reading = text.trim().length > 0;

  return (
    <Sheet
      visible={visible}
      title={t.worship.pasteChart}
      onClose={onClose}
      footer={
        reading ? (
          <PrimaryButton
            label={t.sets.import}
            disabled={!preview.usable}
            onPress={() => {
              onImport(text);
              setText('');
            }}
          />
        ) : undefined
      }
    >
      <Text style={ui.hint}>{t.worship.pasteHint}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={'{title: Mon chant}\n{key: G}\n\n[G]Paroles [D]du [Em]chant [C]ici'}
        placeholderTextColor={c.secondary}
        style={[s.input, s.text]}
        accessibilityLabel={t.worship.pasteHint}
      />

      {!reading ? null : !preview.usable ? (
        <Text style={ui.hint}>{t.worship.nothingReadable}</Text>
      ) : (
        <>
          <SectionHeader>{t.worship.seen}</SectionHeader>
          <Text style={s.line}>{preview.title ?? t.sets.untitled}</Text>
          <Text style={ui.hint}>
            {preview.key === null
              ? t.worship.keyOnly
              : `${t.key} ${noteName(preview.key, notation, prefersFlats(preview.key))} · ${
                  preview.mode === 'minor' ? t.worship.mode.minor : t.worship.mode.major
                }`}
          </Text>
          {preview.sections.map((section, i) => (
            <ListRow
              key={`${section.name}-${i}`}
              title={sectionLabel(section.name, t)}
              subtitle={section.bars.join('  ')}
              last={i === preview.sections.length - 1}
            />
          ))}
          {preview.unknown.length ? (
            <View style={s.unknown}>
              <Text style={ui.hint}>{t.sets.unknownChords(preview.unknown.join(', '))}</Text>
            </View>
          ) : null}
          <ChipRow>
            <Chip label={t.cancel} onPress={onClose} />
          </ChipRow>
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
    text: { minHeight: 170, textAlignVertical: 'top' },
    line: { ...type.cardTitle, color: c.label, paddingHorizontal: space.lg },
    unknown: { marginTop: space.md },
  });
