import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  useFonts,
} from '@expo-google-fonts/newsreader';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FloatingTabBar } from './src/components/FloatingTabBar';
import { GuideOrigin, LayerId, Nav, NavContext, RetestContext, TabBarContext, TabId } from './src/navigation';
import { HomeScreen } from './src/screens/HomeScreen';
import { MancheScreen } from './src/screens/MancheScreen';
import { MeScreen } from './src/screens/MeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { WorshipScreen } from './src/screens/WorshipScreen';
import { SettingsProvider, useSettings } from './src/state/settings';
import { AuthProvider } from './src/services/auth';
import { SyncProvider } from './src/services/sync';
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
          {/* Le compte, puis l'échange : l'échange a besoin de savoir qui est
              connecté, et il n'existe pas sans compte. */}
          <AuthProvider>
            <SyncProvider>
              <Shell />
            </SyncProvider>
          </AuthProvider>
        </SongsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { settings, ready } = useSettings();
  const { dark } = useTheme();
  const s = useStyles(makeStyles);
  const [tab, setTab] = useState<TabId>('home');
  const [layer, setLayer] = useState<LayerId>('notes');
  // Le guide ouvert dans Moi, et l'écran d'où l'on y est venu (pour « Retour à … »).
  const [guide, setGuide] = useState<{ section: string | null; origin: GuideOrigin | null } | null>(null);
  const [welcomed, setWelcomed] = useState(false);
  // Le test du niveau, rouvert depuis « Mon espace ».
  const [retest, setRetest] = useState(false);
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

  const nav = useMemo<Nav>(
    () => ({
      openLayer: (next) => {
        setLayer(next);
        setTab('neck');
      },
      openGuide: (section, origin) => {
        setGuide({ section, origin });
        setTab('me');
      },
      goTab: setTab,
    }),
    [],
  );

  const backToOrigin = useCallback(() => {
    setGuide((current) => {
      if (current?.origin) {
        if (current.origin.layer) setLayer(current.origin.layer);
        setTab(current.origin.tab);
      }
      return null;
    });
  }, []);

  // Quitter Moi ferme le guide : y revenir par la barre ouvre Moi, pas la page lue.
  const changeTab = useCallback((next: TabId) => {
    setTab(next);
    if (next !== 'me') setGuide(null);
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
  if (ready && ((!settings.onboarded && !welcomed) || retest)) {
    return (
      <OnboardingScreen
        onDone={() => {
          setWelcomed(true);
          setRetest(false);
        }}
      />
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* Le contexte enveloppe les écrans, pas seulement la barre : c'est un
          écran — une séance en plein écran — qui demande à la cacher. */}
      <RetestContext.Provider value={() => setRetest(true)}>
      <NavContext.Provider value={nav}>
      <TabBarContext.Provider value={hold}>
        <View style={s.body}>
          {tab === 'home' && <HomeScreen />}
          {tab === 'neck' && <MancheScreen layer={layer} onLayer={setLayer} />}
          {tab === 'sunday' && <WorshipScreen />}
          {tab === 'me' && <MeScreen guide={guide} onGuide={setGuide} onBackToOrigin={backToOrigin} />}
        </View>

        {!keyboard && !held && <FloatingTabBar tab={tab} onChange={changeTab} />}
      </TabBarContext.Provider>
      </NavContext.Provider>
      </RetestContext.Provider>
    </View>
  );
}

const makeStyles = ({ c }: Theme) => StyleSheet.create({ root: { flex: 1 }, body: { flex: 1, backgroundColor: c.background } });
