import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  useFonts,
} from '@expo-google-fonts/newsreader';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Segmented } from './src/components/ui';
import { CagedScreen } from './src/screens/CagedScreen';
import { ChordsScreen } from './src/screens/ChordsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { ScalesScreen } from './src/screens/ScalesScreen';
import { WorshipScreen } from './src/screens/WorshipScreen';
import { SettingsProvider, useSettings } from './src/state/settings';
import { SongsProvider } from './src/songs/store';
import { Theme, useStyles } from './src/theme';

type Tab = 'worship' | 'scales' | 'chords' | 'caged' | 'practice';
const TABS: Tab[] = ['worship', 'scales', 'chords', 'caged', 'practice'];

// The splash stays up until the serif is in memory: otherwise the first frame
// draws in the system font and the titles visibly jump a moment later.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [loaded, error] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_400Regular_Italic,
  });

  useEffect(() => {
    // A font that will not load is not a reason to show nothing at all: the app
    // falls back to the system serif and carries on.
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SongsProvider>
          <Shell />
        </SongsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { settings, ready, t, update } = useSettings();
  const s = useStyles(makeStyles);
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
      <StatusBar style={settings.appearance === 'dark' ? 'light' : 'dark'} />
      <View style={s.header}>
        <View style={s.headerText}>
          <Text style={s.title}>{t.appName}</Text>
          <Text style={s.tagline}>{t.tagline}</Text>
        </View>
        <View style={s.lang}>
          <Segmented<'fr' | 'en'>
            value={settings.lang}
            onChange={(lang) => update({ lang })}
            options={[
              { value: 'fr', label: 'FR' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </View>
      </View>

      <View style={s.body}>
        {tab === 'worship' && <WorshipScreen />}
        {tab === 'scales' && <ScalesScreen />}
        {tab === 'chords' && <ChordsScreen />}
        {tab === 'caged' && <CagedScreen />}
        {tab === 'practice' && <PracticeScreen />}
      </View>

      <View style={s.tabBar}>
        {TABS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            style={s.tabItem}
          >
            {/* L'onglet actif se marque par un trait **et** par sa graisse : la
                couleur seule ne suffit pas à tout le monde. */}
            <View style={[s.tabMark, tab === id && s.tabMarkActive]} />
            <Text style={[s.tabText, tab === id && s.tabTextActive]}>{t.tabs[id]}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: space.sm },
    headerText: { flex: 1 },
    title: { ...type.cardTitle, color: c.label, paddingHorizontal: space.lg },
    tagline: { ...type.caption, color: c.secondary, paddingHorizontal: space.lg, marginTop: 2 },
    lang: { width: 108, marginRight: space.lg, marginTop: space.xs },
    body: { flex: 1 },
    tabBar: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
      backgroundColor: c.background,
      paddingBottom: space.xs,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space.sm,
      minHeight: 48,
    },
    tabMark: { width: 18, height: 3, borderRadius: 2, marginBottom: 6, backgroundColor: 'transparent' },
    tabMarkActive: { backgroundColor: c.accent },
    tabText: { ...type.tab, color: c.secondary },
    tabTextActive: { color: c.label, fontWeight: '700' },
  });
