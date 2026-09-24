import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Line, Path, Polygon } from 'react-native-svg';
import { useSettings } from '../state/settings';
import { colors } from '../theme';

/**
 * Mutes or restores playback.
 *
 * The two states differ by shape — waves against a slash — not by colour alone,
 * so the icon still reads for anyone who cannot tell the two tints apart.
 */
export function SoundToggle() {
  const { settings, t, update } = useSettings();
  const on = settings.sound;

  return (
    <Pressable
      onPress={() => update({ sound: !on })}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={on ? t.soundOn : t.soundOff}
      style={s.button}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Polygon points="3,9 7,9 12,4 12,20 7,15 3,15" fill={colors.text} />
        {on ? (
          <>
            <Path
              d="M15 8.5a5 5 0 0 1 0 7"
              stroke={colors.text}
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M17.5 6a8.5 8.5 0 0 1 0 12"
              stroke={colors.text}
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <Line x1={15} y1={7} x2={22} y2={17} stroke={colors.muted} strokeWidth={2.2} strokeLinecap="round" />
        )}
      </Svg>
    </Pressable>
  );
}

const s = StyleSheet.create({
  // 44 points, so the target clears the minimum even though the glyph is 24.
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
