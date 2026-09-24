/**
 * Generates one mono WAV per guitar pitch by Karplus-Strong synthesis.
 * No external samples are used or copied: every file is computed here.
 *
 *   npm run gen:sounds          write assets/sounds/*.wav + src/audio/samples.ts
 *   npm run gen:sounds -- check render in memory only and report the decay table
 *
 * Standard tuning on a 15-fret neck needs MIDI 40 (low E, open) to 79 (high E, fret 15).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050; // guitar fundamentals and low harmonics sit well under Nyquist
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = join(ROOT, 'assets', 'sounds');
const SAMPLES_MODULE = join(ROOT, 'src', 'audio', 'samples.ts');

/** Open low E is MIDI 40; the high E string at fret 15 is MIDI 79. */
export const MIDI_LOW = 40;
export const MIDI_HIGH = 79;

/** Longest a note may run before we cut it, even if the model wants more. */
const MAX_SECONDS = 4.2;

export const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Deterministic PRNG so a rebuild reproduces byte-identical files. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Time in seconds for a note to fall 60 dB. A wound bass string rings far longer
 * than a plain high E, so this is interpolated across the range.
 */
function decaySeconds(midi: number) {
  const t = (midi - MIDI_LOW) / (MIDI_HIGH - MIDI_LOW);
  return 3.2 + t * (1.3 - 3.2);
}

/** Loop-filter brightness: the two-point average that gives the plucked tone. */
const BRIGHTNESS = 0.5;
/** Feedback applied once per period. Kept under 1 by the calibration loop. */
type Render = { samples: Float32Array; peak: number };

/**
 * One pass of the string model.
 *
 * The delay line is fractional: reading at `idx + delay` rather than rounding the
 * period to whole samples. Rounding would put G5 at 787.5 Hz instead of 784 Hz —
 * 13 cents sharp, which is not acceptable in an ear-training app.
 */
/** Buffer length for a note. Fixed for the whole calibration run and given
 *  headroom: letting it track the delay would step by a whole sample as the
 *  delay crossed an integer, jumping the pitch discontinuously. */
const bufferSize = (midi: number) => Math.ceil(SAMPLE_RATE / midiToFreq(midi)) + 8;

function render(midi: number, gain: number, delay: number, seconds = MAX_SECONDS): Float32Array {
  const total = Math.floor(SAMPLE_RATE * seconds);
  const size = bufferSize(midi);
  const out = new Float32Array(total);
  const buf = new Float32Array(size);

  // Excitation: white noise softened by a one-pole, mimicking a pick transient.
  const rand = mulberry32(midi * 2654435761);
  let prev = 0;
  for (let i = 0; i < size; i++) {
    prev = 0.5 * (rand() * 2 - 1) + 0.5 * prev;
    buf[i] = prev;
  }

  let idx = 0;
  let lastFiltered = 0;
  for (let i = 0; i < total; i++) {
    // Read *behind* the write head: a sample written at step i must come back
    // exactly `delay` steps later. Reading ahead (idx + delay) would make the
    // loop length size - delay — a few samples, not a guitar string.
    let read = idx - delay;
    if (read < 0) read += size;
    const base = Math.floor(read);
    const frac = read - base;
    const a = buf[base % size];
    const b = buf[(base + 1) % size];
    const delayed = a + (b - a) * frac;

    out[i] = delayed;
    const filtered = delayed + BRIGHTNESS * (lastFiltered - delayed);
    lastFiltered = filtered;
    buf[idx] = gain * filtered;
    idx = (idx + 1) % size;
  }
  return out;
}

/** Measured time to fall 60 dB, read off the rendered samples. */
function measureT60(samples: Float32Array) {
  const win = Math.floor(SAMPLE_RATE * 0.02);
  let peak = 0;
  for (let i = 0; i < samples.length; i += win) {
    let sum = 0;
    for (let j = 0; j < win && i + j < samples.length; j++) sum += samples[i + j] * samples[i + j];
    peak = Math.max(peak, Math.sqrt(sum / win));
  }
  if (peak <= 0) return 0;
  const floor = peak * 0.001;
  for (let i = 0; i < samples.length; i += win) {
    let sum = 0;
    for (let j = 0; j < win && i + j < samples.length; j++) sum += samples[i + j] * samples[i + j];
    if (Math.sqrt(sum / win) <= floor) return i / SAMPLE_RATE;
  }
  return samples.length / SAMPLE_RATE;
}

/**
 * Finds the loop gain that lands the note on its target -60 dB time.
 *
 * The decay is *measured* rather than predicted: the in-place circular update
 * does not reduce to a clean analytic transfer function, and an earlier
 * model-based version produced notes that droned instead of decaying. Each pass
 * measures the achieved time and rescales the gain — the loop gain is
 * proportional to it, so one correction is exact.
 */
/**
 * Pitch and decay are calibrated in two separate passes on purpose.
 *
 * The loop gain is a plain scalar, so it cannot move the pitch, but the delay
 * does feed back into the decay. Correcting both in one loop made them fight:
 * whichever note had a stubborn pitch never got its decay fixed, and the failures
 * moved around between runs. Tune the delay first, then hold it fixed.
 */
function calibratePitch(midi: number, trace: boolean) {
  const freq = midiToFreq(midi);
  let delay = SAMPLE_RATE / freq;
  let best = { delay, cents: Infinity };

  for (let pass = 0; pass < 24; pass++) {
    const samples = render(midi, 0.999, delay);
    const measuredFreq = estimateFreq(samples, freq);
    const cents = 1200 * Math.log2(measuredFreq / freq);
    if (trace) {
      console.log(`    midi ${midi} hauteur pass ${pass} delay=${delay.toFixed(4)} ${cents.toFixed(2)} cents`);
    }
    if (Math.abs(cents) < Math.abs(best.cents)) best = { delay, cents };
    // The estimator is good to about one cent, so 2 is as close as is meaningful.
    if (Math.abs(cents) <= 2) return { delay, cents };

    // Damped, because a full correction overshoots on a measurement this noisy;
    // clamped, so one wild estimate cannot throw the loop off the rails.
    const factor = 1 + 0.6 * (measuredFreq / freq - 1);
    delay *= Math.max(0.94, Math.min(1.06, factor));
  }
  return best;
}

/** Renders at one gain and measures the sustain it actually produced. */
function decayAt(midi: number, delay: number, gain: number, seconds: number) {
  const samples = render(midi, gain, delay, seconds);
  return { gain, samples, t60: measureT60(samples) };
}

/**
 * Finds the loop gain that lands the note on its target -60 dB time.
 *
 * By bracketing and bisection rather than a modelled step. The -60 dB time rises
 * monotonically with the loop gain but is not affine in it: the delay line
 * supports several modes with different losses, and which one dominates the
 * envelope changes with the gain. So a ratio correction overshoots into a note
 * that never dies while a fixed step undershoots, and the search oscillates
 * between the two extremes forever. Bisection converges whatever the shape.
 */
function calibrateDecay(midi: number, delay: number, trace: boolean) {
  const target = decaySeconds(midi);
  // Long enough to see -60 dB, and to tell "decayed too fast" from "still
  // ringing" at any gain. Rendering the full buffer for a short note wastes time.
  const seconds = Math.min(MAX_SECONDS, target * 1.5 + 0.5);
  const at = (gain: number) => decayAt(midi, delay, gain, seconds);

  // A loop gain of 1 or more never decays, so this is the longest sustain the
  // model can produce at all.
  const top = at(0.99999);
  if (top.t60 <= target) {
    if (trace) {
      console.log(
        `    midi ${midi} décroissance : plafonnée à ${top.t60.toFixed(2)}s (cible ${target.toFixed(2)}s)`,
      );
    }
    return { gain: top.gain, samples: top.samples, achieved: top.t60, target, reachable: false };
  }

  let lo = at(0.98);
  for (let i = 0; i < 60 && lo.t60 > target; i++) lo = at(lo.gain * 0.97);
  if (lo.t60 > target) throw new Error(`MIDI ${midi}: no loop gain brackets the target decay`);

  let hi = top;
  for (let i = 0; i < 24; i++) {
    // Geometric bisection: the gain is a multiplicative factor.
    const mid = at(Math.sqrt(lo.gain * hi.gain));
    const off = Math.abs(mid.t60 - target) / target;
    if (trace) {
      console.log(
        `    midi ${midi} décroissance ${i} gain=${mid.gain.toFixed(6)}` +
          ` T60=${mid.t60.toFixed(2)}s (cible ${target.toFixed(2)}s) écart ${(off * 100).toFixed(1)}%`,
      );
    }
    // measureT60 is quantised to its 20 ms window, so this is as close as the
    // measurement can be asked to land.
    if (off <= 0.03) {
      return { gain: mid.gain, samples: mid.samples, achieved: mid.t60, target, reachable: true };
    }
    if (mid.t60 > target) hi = mid;
    else lo = mid;
  }

  const best = Math.abs(lo.t60 - target) < Math.abs(hi.t60 - target) ? lo : hi;
  const off = Math.abs(best.t60 - target) / target;
  if (trace) console.log(`    midi ${midi} décroissance : meilleur écart ${(off * 100).toFixed(1)}%`);
  return { gain: best.gain, samples: best.samples, achieved: best.t60, target, reachable: off <= 0.03 };
}

export function calibrate(midi: number, trace = false) {
  const pitch = calibratePitch(midi, trace);
  const decay = calibrateDecay(midi, pitch.delay, trace);
  // Report, not warn: a note that cannot reach its nominal sustain is a property
  // of the physics, not a failure of the calibration.
  if (!decay.reachable) {
    console.log(
      `  · MIDI ${midi}: tenue plafonnée à ${decay.achieved.toFixed(2)} s` +
        ` (cible ${decay.target.toFixed(2)} s — maximum atteignable par la boucle)`,
    );
  }
  return {
    gain: decay.gain,
    delay: pitch.delay,
    samples: decay.samples,
    cents: pitch.cents,
    achieved: decay.achieved,
    target: decay.target,
  };
}

/** Cut the tail once the note is 60 dB down, so nothing is chopped mid-sustain. */
function trim(samples: Float32Array) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak === 0) return samples;
  const floor = peak * 0.001;
  const tail = Math.floor(SAMPLE_RATE * 0.09);
  let last = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i]) > floor) {
      last = i;
      break;
    }
  }
  return samples.slice(0, Math.max(Math.min(samples.length, last + tail), Math.floor(SAMPLE_RATE * 0.2)));
}

/** Short fade-in to kill the click at attack, fade-out to avoid a truncation pop. */
function shape(samples: Float32Array) {
  const n = samples.length;
  const attack = Math.floor(SAMPLE_RATE * 0.004);
  const release = Math.floor(SAMPLE_RATE * 0.09);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const norm = peak > 0 ? 0.86 / peak : 1;
  for (let i = 0; i < n; i++) {
    let g = norm;
    if (i < attack) g *= i / attack;
    if (i > n - release) g *= (n - i) / release;
    samples[i] *= g;
  }
  return samples;
}

function toWav(samples: Float32Array): Buffer {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

/**
 * Pitch of the rendered note, by autocorrelation with parabolic interpolation of
 * the peak. The interpolation matters: at G5 one whole-lag step is ~35 cents, so
 * an integer-lag search cannot tell an in-tune note from a badly detuned one.
 */
function estimateFreq(samples: Float32Array, expected: number) {
  // Correlate over the loud, steady part of the note. The decayed tail carries
  // almost no signal, and including it only widens the peak with noise.
  const start = Math.floor(SAMPLE_RATE * 0.05);
  const n = Math.min(4096, Math.floor(SAMPLE_RATE * 0.35));
  const from = Math.max(2, Math.floor(SAMPLE_RATE / (expected * 1.08)));
  const to = Math.ceil(SAMPLE_RATE / (expected * 0.92));

  // Normalised correlation at a *fractional* lag: the peak is far too broad at
  // high pitch to locate by picking an integer lag and interpolating after.
  const corr = (lag: number) => {
    const base = Math.floor(lag);
    const frac = lag - base;
    let sum = 0;
    let e0 = 0;
    let e1 = 0;
    for (let i = 0; i < n; i++) {
      const a = samples[start + i];
      const b0 = samples[start + i + base];
      const b1 = samples[start + i + base + 1];
      const b = b0 + (b1 - b0) * frac;
      sum += a * b;
      e0 += a * a;
      e1 += b * b;
    }
    const denom = Math.sqrt(e0 * e1);
    return denom > 0 ? sum / denom : 0;
  };

  let best = -Infinity;
  let bestLag = from;
  for (let lag = from; lag <= to; lag++) {
    const c = corr(lag);
    if (c > best) {
      best = c;
      bestLag = lag;
    }
  }
  let fineLag = bestLag;
  for (let lag = bestLag - 1; lag <= bestLag + 1; lag += 0.002) {
    const c = corr(lag);
    if (c > best) {
      best = c;
      fineLag = lag;
    }
  }
  return SAMPLE_RATE / fineLag;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const label = (midi: number) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

function main() {
  const checkOnly = process.argv.includes('check');
  if (!checkOnly) mkdirSync(OUTPUT_DIR, { recursive: true });

  const rows: string[] = [];
  const requires: string[] = [];
  let bytes = 0;
  let worstCents = 0;
  let worstPitchCal = 0;
  let worstDecay = 0;

  const only = process.argv.find((a) => /^\d+$/.test(a));
  const trace = process.env.DEBUG_SOUNDS === '1';
  const from = only ? Number(only) : MIDI_LOW;
  const to = only ? Number(only) : MIDI_HIGH;

  for (let midi = from; midi <= to; midi++) {
    const { samples, cents: pitchCents, achieved, target } = calibrate(midi, trace);
    const trimmed = shape(trim(samples));
    const wav = toWav(trimmed);
    if (!checkOnly) writeFileSync(join(OUTPUT_DIR, `${midi}.wav`), wav);
    bytes += wav.length;
    requires.push(`  ${midi}: require('../../assets/sounds/${midi}.wav'),`);

    const expected = midiToFreq(midi);
    const cents = 1200 * Math.log2(estimateFreq(trimmed, expected) / expected);
    worstCents = Math.max(worstCents, Math.abs(cents));
    worstPitchCal = Math.max(worstPitchCal, Math.abs(pitchCents));
    worstDecay = Math.max(worstDecay, Math.abs(achieved - target) / target);
    rows.push(
      `  ${String(midi).padStart(2)}  ${label(midi).padEnd(4)} ${expected.toFixed(1).padStart(7)} Hz` +
        `  T60 ${achieved.toFixed(2)}/${target.toFixed(2)} s  ${cents >= 0 ? '+' : ''}${cents.toFixed(1)} cents` +
        `  ${(wav.length / 1024).toFixed(0)} Ko`,
    );
  }

  // Never rewrite the sample map from a single-note debug run.
  if (!checkOnly && !only) {
    const file = [
      '// GENERATED by scripts/gen-sounds.ts — do not edit by hand.',
      '// Metro needs static require() literals, so the map is emitted rather than built at runtime.',
      '',
      `export const SOUND_SAMPLE_RATE = ${SAMPLE_RATE};`,
      `export const SOUND_MIDI_LOW = ${MIDI_LOW};`,
      `export const SOUND_MIDI_HIGH = ${MIDI_HIGH};`,
      '',
      '/** MIDI number -> bundled WAV module. */',
      'export const SAMPLES: Record<number, number> = {',
      ...requires,
      '};',
      '',
      'export const hasSample = (midi: number) => midi in SAMPLES;',
      '',
    ].join('\n');
    mkdirSync(dirname(SAMPLES_MODULE), { recursive: true });
    writeFileSync(SAMPLES_MODULE, file);
  }

  console.log(`${checkOnly ? '[check] ' : ''}${MIDI_LOW}..${MIDI_HIGH} — ${(bytes / 1024 / 1024).toFixed(2)} Mo au total`);
  console.log(
    `écart de justesse max : ${worstCents.toFixed(1)} cents` +
      `  |  écart de tenue max : ${(worstDecay * 100).toFixed(1)} %` +
      `  |  justesse mesurée par la calibration : ${worstPitchCal.toFixed(1)} cents`,
  );
  console.log(rows.join('\n'));
}

main();
