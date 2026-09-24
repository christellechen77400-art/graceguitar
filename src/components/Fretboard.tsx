import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useNotePlayer } from '../audio/useNotePlayer';
import { useSettings } from '../state/settings';
import { colors } from '../theme';
import { FRET_COUNT, fretToMidi, noteName, pcAt, STANDARD_TUNING, STRING_COUNT } from '../theory/notes';

export type MarkerKind = 'root' | 'tone' | 'chord' | 'ghost';

export interface Marker {
  string: number; // 0 = low E
  fret: number; // 0 = open
  kind: MarkerKind;
  label?: string;
  ring?: boolean;
  dim?: boolean;
}

interface Props {
  markers: Marker[];
  muted?: number[];
  onPressCell?: (string: number, fret: number) => void;
  focusFret?: number;
}

const NUT_W = 44;
const FRET_W = 60;
/** String spacing doubles as the touch target height, so it clears 44 points. */
const GAP = 44;
const TOP = 18;
const BOTTOM = 30;
const R = 13;
const SINGLE_INLAYS = [3, 5, 7, 9, 15];
const NUMBERED = [3, 5, 7, 9, 12, 15];

const FILL: Record<MarkerKind, string> = {
  root: colors.gold,
  tone: colors.sky,
  chord: colors.lilac,
  ghost: 'none',
};

export function Fretboard({ markers, muted = [], onPressCell, focusFret }: Props) {
  const { notation, t } = useSettings();
  const { playNote } = useNotePlayer();
  const scrollRef = useRef<ScrollView>(null);

  // Every board sounds, not just the ones that select something: hearing the note
  // is the point of a fretboard app, and it costs the caller nothing.
  const onCell = (string: number, fret: number) => {
    playNote(fretToMidi(string, fret));
    onPressCell?.(string, fret);
  };

  const cellLabel = (string: number, fret: number) =>
    t.a11y.cell(
      noteName(STANDARD_TUNING[string], notation, false),
      fret,
      noteName(pcAt(string, fret), notation, false),
    );

  const boardH = GAP * (STRING_COUNT - 1);
  const width = NUT_W + FRET_COUNT * FRET_W + 12;
  const height = TOP + boardH + BOTTOM;
  const yFor = (s: number) => TOP + (STRING_COUNT - 1 - s) * GAP;
  const xFor = (f: number) => (f === 0 ? NUT_W / 2 - 4 : NUT_W + (f - 0.5) * FRET_W);
  const midY = TOP + boardH / 2;

  useEffect(() => {
    if (focusFret === undefined) return;
    const x = Math.max(0, NUT_W + (focusFret - 1) * FRET_W - 48);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [focusFret]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8 }}
    >
      <Svg width={width} height={height}>
        <Rect
          x={NUT_W}
          y={TOP - 12}
          width={FRET_COUNT * FRET_W}
          height={boardH + 24}
          rx={4}
          fill={colors.rosewood}
          stroke={colors.rosewoodEdge}
          strokeWidth={2}
        />

        {SINGLE_INLAYS.map((f) => (
          <Circle key={`in${f}`} cx={xFor(f)} cy={midY} r={6} fill={colors.inlay} opacity={0.55} />
        ))}
        <Circle cx={xFor(12)} cy={TOP + GAP * 1.5} r={6} fill={colors.inlay} opacity={0.55} />
        <Circle cx={xFor(12)} cy={TOP + GAP * 3.5} r={6} fill={colors.inlay} opacity={0.55} />

        {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((f) => (
          <Line
            key={`fw${f}`}
            x1={NUT_W + f * FRET_W}
            x2={NUT_W + f * FRET_W}
            y1={TOP - 12}
            y2={TOP + boardH + 12}
            stroke={colors.fretWire}
            strokeWidth={2}
          />
        ))}
        <Rect x={NUT_W - 5} y={TOP - 12} width={7} height={boardH + 24} fill={colors.bone} />

        {Array.from({ length: STRING_COUNT }, (_, s) => (
          <Line
            key={`st${s}`}
            x1={NUT_W - 5}
            x2={NUT_W + FRET_COUNT * FRET_W}
            y1={yFor(s)}
            y2={yFor(s)}
            stroke={colors.string}
            strokeWidth={2.6 - s * 0.35}
          />
        ))}

        {NUMBERED.map((f) => (
          <SvgText
            key={`n${f}`}
            x={xFor(f)}
            y={TOP + boardH + 28}
            fill={colors.muted}
            fontSize={12}
            textAnchor="middle"
          >
            {f}
          </SvgText>
        ))}

        {muted.map((s) => (
          <SvgText
            key={`m${s}`}
            x={xFor(0)}
            y={yFor(s) + 5}
            fill={colors.muted}
            fontSize={15}
            fontWeight="700"
            textAnchor="middle"
          >
            ×
          </SvgText>
        ))}

        {markers.map((m) => {
          const cx = xFor(m.fret);
          const cy = yFor(m.string);
          const ghost = m.kind === 'ghost';
          return (
            <G key={`${m.string}-${m.fret}`} opacity={m.dim ? 0.28 : 1}>
              {m.ring && <Circle cx={cx} cy={cy} r={R + 3.5} fill="none" stroke={colors.cream} strokeWidth={2.5} />}
              {/* A root is outlined as well as filled. Roots and chord tones differ
                  in colour, and colour alone is not a difference everyone can see. */}
              {m.kind === 'root' && (
                <Circle cx={cx} cy={cy} r={R + 1.5} fill="none" stroke={colors.cream} strokeWidth={1.5} />
              )}
              <Circle
                cx={cx}
                cy={cy}
                r={R}
                fill={FILL[m.kind]}
                stroke={ghost ? colors.inlay : 'none'}
                strokeOpacity={0.55}
                strokeWidth={1.5}
              />
              {m.label ? (
                <SvgText
                  x={cx}
                  y={cy + 4}
                  fill={ghost ? colors.text : colors.ink}
                  fontSize={m.label.length > 3 ? 9 : 11}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {m.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {Array.from({ length: STRING_COUNT }, (_, s) =>
          Array.from({ length: FRET_COUNT + 1 }, (_, f) => (
            <Rect
              key={`hit${s}-${f}`}
              x={f === 0 ? 0 : NUT_W + (f - 1) * FRET_W}
              y={yFor(s) - GAP / 2}
              // The open-string target stops at the nut, which is exactly 44 wide.
              width={f === 0 ? NUT_W : FRET_W}
              height={GAP}
              fill="#000"
              fillOpacity={0.001}
              onPress={() => onCell(s, f)}
              // react-native-svg takes no accessibilityRole here, so the label is
              // what a screen reader gets: "A string, fret 3: C".
              accessible
              accessibilityLabel={cellLabel(s, f)}
            />
          )),
        )}
      </Svg>
    </ScrollView>
  );
}
