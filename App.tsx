import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SoundToggle } from './src/components/SoundToggle';
import { Segmented } from './src/components/ui';
import { CagedScreen } from './src/screens/CagedScreen';
import { ChordsScreen } from './src/screens/ChordsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { ScalesScreen } from './src/screens/ScalesScreen';
import { WorshipScreen } from './src/screens/WorshipScreen';
import { SettingsProvider, useSettings } from './src/state/settings';
import { SongsProvider } from './src/songs/store';
import { colors, fonts, space } from './src/theme';
import { Lang } from './src/i18n';
import { Notation } from './src/theory/notes';

type Tab = 'worship' | 'scales' | 'chords' | 'caged' | 'practice';
const TABS: Tab[] = ['worship', 'scales', 'chords', 'caged', 'practice'];

export default function App() {
  return (
    <SettingsProvider>
      <SongsProvider>
        <Shell />
      </SongsProvider>
    </SettingsProvider>
  );
}

function Shell() {
  const { settings, ready, t, update } = useSettings();
  const [tab, setTab] = useState<Tab>('worship');
  const [welcomed, setWelcomed] = useState(false);

  // The welcome questions come before anything else, and only ever once. They wait
  // for the stored settings to be read, so they cannot flash for someone who has
  // already answered them.
  if (ready && !settings.onboarded && !welcomed) {
    return <OnboardingScreen onDone={() => setWelcomed(true)} />;
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t.appName}</Text>
          <Text style={s.tagline}>{t.tagline}</Text>
        </View>
        <View style={s.toggles}>
          <View style={s.sound}>
            <SoundToggle />
          </View>
          <View style={s.toggle}>
            <Segmented<Lang>
              value={settings.lang}
              onChange={(lang) => update({ lang })}
              options={[
                { value: 'fr', label: 'FR' },
                { value: 'en', label: 'EN' },
              ]}
            />
          </View>
          {settings.lang === 'fr' && (
            <View style={[s.toggle, { marginTop: space.xs }]}>
              <Segmented<Notation>
                value={settings.notation}
                onChange={(notation) => update({ notation })}
                options={[
                  { value: 'anglo', label: 'C D E' },
                  { value: 'latin', label: 'Do Ré' },
                ]}
              />
            </View>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space.xl * 2 }}>
        {tab === 'worship' && <WorshipScreen />}
        {tab === 'scales' && <ScalesScreen />}
        {tab === 'chords' && <ChordsScreen />}
        {tab === 'caged' && <CagedScreen />}
        {tab === 'practice' && <PracticeScreen />}
      </ScrollView>

      <View style={s.tabBar}>
        {TABS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            style={s.tabItem}
          >
            <View style={[s.tabMark, tab === id && s.tabMarkActive]} />
            <Text style={[s.tabText, tab === id && s.tabTextActive]}>{t.tabs[id]}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  title: { color: colors.text, fontSize: 34, fontFamily: fonts.display },
  tagline: { color: colors.muted, fontSize: 14, marginTop: 2 },
  toggles: { width: 130 },
  toggle: { marginHorizontal: -space.lg },
  sound: { alignItems: 'flex-end', marginBottom: space.xs },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingBottom: space.xs,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingTop: space.sm, paddingBottom: space.sm, minHeight: 48 },
  tabMark: { width: 18, height: 3, borderRadius: 2, marginBottom: 6, backgroundColor: 'transparent' },
  tabMarkActive: { backgroundColor: colors.gold },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.text },
});
