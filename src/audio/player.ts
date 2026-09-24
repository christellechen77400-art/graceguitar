/**
 * Note playback. Everything the app knows about the audio library lives here, so
 * swapping expo-audio for another one is a change to this file only.
 *
 * Each pitch gets its own player, created on first use and then kept. Taps then
 * retrigger instantly instead of decoding a file every time, which is the
 * difference between an instrument and a sample launcher. The 40 notes are short
 * mono files, a few megabytes in total.
 */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { hasSample, SAMPLES } from './samples';

const players = new Map<number, AudioPlayer>();
let strumTimers: ReturnType<typeof setTimeout>[] = [];
let soundOn = true;
let volume = 1;

/**
 * Routes playback so a guitar app behaves like an instrument: it must be heard
 * with the ringer switch off. Recording stays disabled — Kinnor never opens the
 * microphone, and the config plugin is set the same way.
 */
let ready: Promise<void> | null = null;
export function initAudio(): Promise<void> {
  if (!ready) {
    ready = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {
      // A device that refuses the session should still get a silent app, not a crash.
    });
  }
  return ready;
}

function playerFor(midi: number): AudioPlayer | null {
  if (!hasSample(midi)) return null;
  let player = players.get(midi);
  if (!player) {
    player = createAudioPlayer(SAMPLES[midi]);
    player.volume = volume;
    players.set(midi, player);
  }
  return player;
}

export function setSoundEnabled(on: boolean) {
  soundOn = on;
  if (!on) stopAll();
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  players.forEach((p) => {
    p.volume = volume;
  });
}

/**
 * Sounds one pitch, optionally after a delay.
 *
 * The seek is not awaited: it lands within a millisecond or two, and waiting for
 * it would put a gap between the tap and the sound. Retriggering a note that is
 * still ringing restarts it, which is what a string does when plucked again.
 */
export function playNote(midi: number, delayMs = 0) {
  if (!soundOn) return;
  const fire = () => {
    const player = playerFor(midi);
    if (!player) return;
    player.seekTo(0).catch(() => {});
    player.play();
  };
  if (delayMs > 0) strumTimers.push(setTimeout(fire, delayMs));
  else fire();
}

/**
 * Sounds several pitches low string to high, a few milliseconds apart, like a
 * downward strum. Returns how long the strum lasts, so a caller can wait it out.
 */
export function playStrum(midis: number[], stepMs = 55): number {
  if (!soundOn || midis.length === 0) return 0;
  stopStrum();
  midis.forEach((midi, i) => playNote(midi, i * stepMs));
  return (midis.length - 1) * stepMs;
}

/** Cancels a strum that has not finished sounding. */
export function stopStrum() {
  strumTimers.forEach(clearTimeout);
  strumTimers = [];
}

export function stopAll() {
  stopStrum();
  players.forEach((p) => p.pause());
}

/** Frees the players. Only needed when the audio session goes away for good. */
export function releaseAudio() {
  stopAll();
  players.forEach((p) => p.remove());
  players.clear();
}
