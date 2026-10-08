import React, { useState } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { BookIcon, BulbIcon } from '../components/icons';
import { ListRow, Screen, SectionHeader, Segmented } from '../components/ui';
import { APP_VERSION, FEEDBACK_EMAIL } from '../config';
import { GuideOrigin } from '../navigation';
import { Theme, useStyles, useTheme } from '../theme';
import { useSettings } from '../state/settings';
import { GuideScreen, TipsScreen } from './GuideScreens';
import { SpaceSheet } from './SpaceSheet';

/**
 * L'onglet Moi : l'apparence, la langue, le guide, les tips, et les réglages.
 *
 * Jour est le défaut ; Sombre se choisit ici, d'une touche. Tout le reste des
 * réglages (compte, exercices, son, données) vit dans « Tous les réglages ».
 */
export function MeScreen({
  guide,
  onGuide,
  onBackToOrigin,
}: {
  guide: { section: string | null; origin: GuideOrigin | null } | null;
  onGuide: (guide: { section: string | null; origin: GuideOrigin | null } | null) => void;
  onBackToOrigin: () => void;
}) {
  const { settings, t, update } = useSettings();
  const { dark, c } = useTheme();
  const s = useStyles(makeStyles);
  const [view, setView] = useState<'main' | 'tips'>('main');
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (guide) {
    return (
      <GuideScreen
        section={guide.section}
        origin={guide.origin}
        onSection={(section) => onGuide({ section, origin: guide.origin })}
        onBackToOrigin={onBackToOrigin}
        onClose={() => onGuide(null)}
      />
    );
  }
  if (view === 'tips') return <TipsScreen onClose={() => setView('main')} />;

  return (
    <Screen tab="me" title={t.me.title}>
      <SectionHeader>{t.me.appearance}</SectionHeader>
      <Segmented<'light' | 'dark'>
        value={dark ? 'dark' : 'light'}
        onChange={(appearance) => update({ appearance })}
        options={[
          { value: 'light', label: t.me.light },
          { value: 'dark', label: t.me.dark },
        ]}
      />

      <SectionHeader>{t.me.language}</SectionHeader>
      <Segmented<'fr' | 'en'>
        value={settings.lang}
        onChange={(lang) => update({ lang })}
        options={[
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' },
        ]}
      />
      {settings.lang === 'fr' ? (
        <>
          <SectionHeader>{t.me.notation}</SectionHeader>
          <Segmented<'anglo' | 'latin'>
            value={settings.notation}
            onChange={(notation) => update({ notation })}
            options={[
              { value: 'latin', label: 'Do Ré Mi' },
              { value: 'anglo', label: 'C D E' },
            ]}
          />
        </>
      ) : null}

      <SectionHeader>{t.me.app}</SectionHeader>
      <ListRow
        icon={<BookIcon color={c.iconForeground} size={20} />}
        title={t.me.guide}
        subtitle={t.me.guideHint}
        chevron
        onPress={() => onGuide({ section: null, origin: null })}
      />
      <ListRow
        icon={<BulbIcon color={c.iconForeground} size={20} />}
        title={t.me.allTips}
        chevron
        onPress={() => setView('tips')}
      />
      <ListRow title={t.me.settings} subtitle={t.me.settingsHint} chevron onPress={() => setSettingsOpen(true)} />
      {FEEDBACK_EMAIL ? (
        <ListRow
          title={t.me.feedback}
          chevron
          onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}`).catch(() => {})}
        />
      ) : null}
      <ListRow title={t.space.version} value={APP_VERSION} last />
      <Text style={s.footer}>{t.appName}</Text>

      <SpaceSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Screen>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    footer: { ...type.caption, color: c.secondary, textAlign: 'center', marginTop: space.xl },
  });
