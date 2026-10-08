import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarIcon, HomeIcon, IconProps, NeckIcon, PersonIcon } from './icons';
import { tapFeedback } from '../haptics';
import { scrollTabToTop, TabId, TABS } from '../navigation';
import { useSettings } from '../state/settings';
import { GLASS, TAB_BAR, Theme, useStyles, useTheme } from '../theme';

const ICONS: Record<TabId, (props: IconProps) => React.ReactElement> = {
  home: HomeIcon,
  neck: NeckIcon,
  sunday: CalendarIcon,
  me: PersonIcon,
};

/** Le ressort de la charte : ni élastique, ni mou. */
const SPRING = { damping: 16, stiffness: 180, mass: 0.9 };
/** Le mouvement réduit se fait sans ressort, et plus court. */
const REDUCED = { duration: 150 };
/** La couleur des icônes et des libellés suit la pastille en 200 ms. */
const FADE = { duration: 200 };

export function FloatingTabBar({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  const s = useStyles(makeStyles);
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [trackW, setTrackW] = useState(0);

  const slot = (trackW - TAB_BAR.padding * 2) / TABS.length;
  const x = useSharedValue(0);

  useEffect(() => {
    if (slot <= 0) return;
    const to = TABS.indexOf(tab) * slot;
    x.value = reduceMotion ? withTiming(to, REDUCED) : withSpring(to, SPRING);
  }, [tab, slot, reduceMotion, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const select = (id: TabId) => {
    if (id === tab) {
      scrollTabToTop(id);
      return;
    }
    tapFeedback();
    onChange(id);
  };

  return (
    <View style={[s.wrap, { bottom: TAB_BAR.bottom + insets.bottom }]} pointerEvents="box-none">
      {/* Le flou est une vue sœur, posée sous la barre : iOS éclaircit ce qui est
          derrière la couche de flou, et un fond opaque sur son parent rendrait le
          verre laiteux. La barre, elle, garde un fond translucide — c'est ce qui
          lui permet de porter l'ombre, qu'un `overflow: hidden` emporterait. */}
      <View style={s.glass} pointerEvents="none">
        <BlurView intensity={60} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </View>

      <View
        style={[
          s.bar,
          {
            backgroundColor: `${c.card}${GLASS.tintAlpha}`,
            borderColor: dark ? GLASS.borderDark : GLASS.borderLight,
          },
        ]}
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      >
        {slot > 0 && <Animated.View style={[s.pill, { width: slot }, pill]} pointerEvents="none" />}
        {TABS.map((id) => (
          <TabButton
            key={id}
            id={id}
            active={id === tab}
            reduceMotion={reduceMotion}
            onPress={() => select(id)}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Un onglet. Son contenu est dessiné deux fois — une fois en couleur secondaire,
 * une fois en couleur de fond par-dessus — et c'est l'opacité de la seconde qui
 * suit la pastille. Animer la couleur d'un trait SVG demanderait de faire passer
 * chaque forme par `useAnimatedProps`, pour un résultat moins net.
 */
function TabButton({
  id,
  active,
  reduceMotion,
  onPress,
}: {
  id: TabId;
  active: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  const { t } = useSettings();
  const Icon = ICONS[id];
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, reduceMotion ? REDUCED : FADE);
  }, [active, reduceMotion, on]);

  const lit = useAnimatedStyle(() => ({ opacity: on.value }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - on.value }));

  const content = (color: string) => (
    <>
      <Icon color={color} size={22} />
      {/* La barre a une hauteur fixe, et la pastille qui marque l'onglet choisi
          aussi : au-delà de 1,4× le libellé déborderait de la pastille et la
          barre mangerait l'écran. Les quatre onglets tiennent alors en une
          icône et un mot court, ce qui reste lisible. */}
      <Text style={[s.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {t.tabs[id]}
      </Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t.tabs[id]}
      style={s.tab}
    >
      <Animated.View style={[s.tabInner, dim]} pointerEvents="none">
        {content(c.secondary)}
      </Animated.View>
      {/* La pastille est pleine de `label` : ce qui se pose dessus est le fond. */}
      <Animated.View style={[s.tabInner, s.tabOver, lit]} pointerEvents="none">
        {content(c.background)}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Le réglage système « Réduire les animations ». Il n'est pas dans Mon espace :
 * c'est une préférence du téléphone, qu'iOS applique à toutes les apps.
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

const makeStyles = ({ c, type, size }: Theme) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: TAB_BAR.side,
      right: TAB_BAR.side,
      height: TAB_BAR.height,
    },
    glass: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: TAB_BAR.radius,
      overflow: 'hidden',
    },
    bar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: TAB_BAR.padding,
      borderRadius: TAB_BAR.radius,
      borderWidth: StyleSheet.hairlineWidth,
      shadowColor: GLASS.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 30,
      shadowOpacity: GLASS.shadowOpacity,
      elevation: 12,
    },
    pill: {
      position: 'absolute',
      left: TAB_BAR.padding,
      top: TAB_BAR.padding,
      height: TAB_BAR.pillHeight,
      borderRadius: TAB_BAR.pillHeight / 2,
      backgroundColor: c.label,
    },
    tab: {
      flex: 1,
      height: TAB_BAR.pillHeight,
      minWidth: size.touch,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabInner: { alignItems: 'center', justifyContent: 'center', gap: 2 },
    tabOver: { ...StyleSheet.absoluteFillObject },
    label: { ...type.tab },
  });
