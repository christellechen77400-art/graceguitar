import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { SectionHeader, Segmented, Sheet, Toggle, useTextStyles } from '../components/ui';
import { useSettings } from '../state/settings';
import { Appearance, Theme, useStyles, useTheme } from '../theme';

/**
 * Mon espace, en mode local.
 *
 * Le son a quitté l'en-tête de l'accueil pour venir ici : c'est un réglage qu'on
 * change une fois, pas un bouton qu'on cherche tous les jours. Il est sous
 * « Affichage et son » avec l'apparence, parce que les deux répondent à la même
 * question — comment l'app se présente.
 *
 * Le prénom sert à la salutation de l'accueil, et partira avec le profil le jour
 * où il y aura un compte.
 */
export function SpaceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, t, update } = useSettings();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();

  return (
    <Sheet visible={visible} title={t.space.title} onClose={onClose} closeLabel={t.close}>
      <SectionHeader>{t.space.profile}</SectionHeader>
      <TextInput
        value={settings.firstName}
        onChangeText={(firstName) => update({ firstName })}
        placeholder={t.space.name}
        placeholderTextColor={c.secondary}
        autoCapitalize="words"
        autoCorrect={false}
        style={s.input}
        accessibilityLabel={t.space.name}
      />
      <Text style={ui.hint}>{t.space.nameHint}</Text>

      <SectionHeader>{t.space.display}</SectionHeader>
      <Toggle
        label={t.space.sound}
        value={settings.sound}
        onChange={(sound) => update({ sound })}
      />
      <Text style={ui.hint}>{t.space.soundHint}</Text>

      <Text style={[ui.hint, s.spaced]}>{t.space.appearance}</Text>
      <Segmented<Appearance>
        value={settings.appearance}
        onChange={(appearance) => update({ appearance })}
        options={[
          { value: 'auto', label: t.space.appearanceMode.auto },
          { value: 'light', label: t.space.appearanceMode.light },
          { value: 'dark', label: t.space.appearanceMode.dark },
        ]}
      />
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
      minHeight: size.touch,
    },
    spaced: { marginTop: space.md },
  });
