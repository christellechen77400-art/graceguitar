import { useEffect, useMemo } from 'react';
import { useSettings } from '../state/settings';
import { initAudio, playNote, playStrum, setSoundEnabled, stopAll, stopStrum } from './player';

/**
 * Playback wired to the sound setting.
 *
 * The returned object is stable, so screens can put it in a dependency array
 * without resubscribing on every render.
 */
export function useNotePlayer() {
  const { settings } = useSettings();

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    setSoundEnabled(settings.sound);
  }, [settings.sound]);

  return useMemo(() => ({ playNote, playStrum, stopStrum, stopAll }), []);
}
