import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  useFonts,
} from '@expo-google-fonts/newsreader';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FloatingTabBar } from './src/components/FloatingTabBar';
import { TabBarContext, TabId } from './src/navigation';
import { ChordsScreen } from './src/screens/ChordsScreen';
import { NeckScreen } from './src/screens/NeckScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { WorshipScreen } from './src/screens/WorshipScreen';
import { SettingsProvider, useSettings } from './src/state/settings';
import { SongsProvider } from './src/songs/store';
import { Theme, useStyles, useTheme } from './src/theme';

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
  const { settings, ready } = useSettings();
  const { dark } = useTheme();
  const s = useStyles(makeStyles);
  const [tab, setTab] = useState<TabId>('today');
  const [welcomed, setWelcomed] = useState(false);
  const [keyboard, setKeyboard] = useState(false);

  // Ceux qui demandent à cacher la barre. Un compteur et non un drapeau : une
  // séance ouverte depuis une feuille demande la même chose que la feuille, et
  // celle qui se ferme ne doit pas rendre la place de l'autre.
  const holds = useRef(new Set<symbol>());
  const [held, setHeld] = useState(false);
  const hold = useCallback((key: symbol, hidden: boolean) => {
    if (hidden) holds.current.add(key);
    else holds.current.delete(key);
    setHeld(holds.current.size > 0);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // The welcome questions come before anything else, and only ever once. They wait
  // for the stored settings to be read, so they cannot flash for someone who has
  // already answered them.
  if (ready && !settings.onboarded && !welcomed) {
    return <OnboardingScreen onDone={() => setWelcomed(true)} />;
  }

  return (
    <View style={s.root}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* Le contexte enveloppe les écrans, pas seulement la barre : c'est un
          écran — une séance en plein écran — qui demande à la cacher. */}
      <TabBarContext.Provider value={hold}>
        <View style={s.body}>
          {tab === 'today' && <TodayScreen />}
          {tab === 'worship' && <WorshipScreen />}
          {tab === 'chords' && <ChordsScreen />}
          {tab === 'neck' && <NeckScreen />}
          {tab === 'practice' && <PracticeScreen />}
        </View>

        {!keyboard && !held && <FloatingTabBar tab={tab} onChange={setTab} />}
      </TabBarContext.Provider>
    </View>
  );
}

const makeStyles = ({ c }: Theme) => StyleSheet.create({ root: { flex: 1 }, body: { flex: 1, backgroundColor: c.background } });
