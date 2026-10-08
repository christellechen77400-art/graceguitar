import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNotePlayer } from '../audio/useNotePlayer';
import { Fretboard } from '../components/Fretboard';
import { Card, Chip, ChipRow, PrimaryButton, SecondaryButton, SectionHeader, Stepper, useTextStyles } from '../components/ui';
import { chainEntries, chordsOfSong, triadEntries } from '../songs/chordInput';
import { recentSongs } from '../songs/library';
import { Song } from '../songs/model';
import { useSongs } from '../songs/store';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { chordById, chordName } from '../theory/chords';
import { FRET_COUNT, OPEN_MIDI, prefersFlats } from '../theory/notes';
import {
  bestChain,
  coverageGaps,
  movement,
  STRING_SET_IDS,
  STRING_SETS,
  StringSetId,
  TriadVoicing,
  voicingRange,
} from '../theory/triads';
import { ChordEntrySheet } from './ChordEntrySheet';
import { InversionsSheet } from './InversionsSheet';
import { triadMarkers } from './triadMarkers';

/** Le plus petit écart entre le début et la fin de la zone : trois cases tiennent une triade. */
const MIN_ZONE = 2;

/**
 * La couche Triades.
 *
 * On choisit un chant (ou on saisit ses accords), une zone du manche, et l'app
 * propose pour chaque accord la triade qui garde la main là où elle est. Si la
 * forme proposée ne plaît pas, « Toutes les inversions » montre les autres.
 */
export function TriadsPanel() {
  const { settings, notation, t, update } = useSettings();
  const store = useSongs();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const { playStrum } = useNotePlayer();

  const [entering, setEntering] = useState<'new' | 'edit' | null>(null);
  const [inversions, setInversions] = useState(false);
  const [selected, setSelected] = useState(0);
  const [pins, setPins] = useState<Record<number, TriadVoicing>>({});

  const song: Song | null = store.songs.find((x) => x.id === settings.triadSongId) ?? null;
  const set: StringSetId = settings.stringSet;
  const lo = settings.zoneLo;
  const hi = settings.zoneHi;
  const flats = prefersFlats(song?.defaultKey ?? settings.keyRoot);

  const entries = useMemo(() => triadEntries(song ? chordsOfSong(song) : []), [song]);
  const chain = useMemo(() => chainEntries(entries), [entries]);
  const triads = useMemo(() => chain.map((entry) => entry.triad!), [chain]);
  const signature = `${song?.id}|${triads.map((x) => `${x.root}${x.quality}`).join()}|${set}|${lo}|${hi}`;

  // Les formes imposées valent pour un chant, une zone et un jeu de cordes : si l'un
  // des trois change, on repart de la proposition.
  useEffect(() => {
    setPins({});
    setSelected(0);
  }, [signature]);

  const result = useMemo(() => (triads.length ? bestChain(triads, set, lo, hi, pins) : null), [triads, set, lo, hi, pins]);
  const gaps = useMemo(() => (triads.length && !result ? coverageGaps(triads, set, lo, hi) : []), [triads, set, lo, hi, result]);

  const labelOf = (index: number) => {
    const triad = triads[index];
    return chordName(triad.root, chordById(triad.quality), notation, flats);
  };
  const enteredLabel = (index: number) => {
    const { root, chord } = entries[index].entered;
    return chordName(root, chordById(chord), notation, flats);
  };

  const current = Math.min(selected, Math.max(0, triads.length - 1));
  const voicing = result?.path[current] ?? null;
  const previous = result && current > 0 ? result.path[current - 1] : null;

  const stringLabel = (stringIndex: number) => {
    const name = chordName(OPEN_MIDI[stringIndex] % 12, chordById('maj'), notation, false);
    const base = settings.lang === 'fr' && notation === 'latin' ? name.toLowerCase() : name;
    return stringIndex === 5 ? t.triads.highString(base) : base;
  };

  const movementText = () => {
    if (!voicing || !previous) return null;
    const move = movement(previous, voicing);
    if (move.moved === 0) return t.triads.same;
    if (move.moved === 1) {
      const i = move.deltas.findIndex((d) => d !== 0);
      return t.triads.oneMoves(t.triads.stringName(stringLabel(STRING_SETS[set][i])), Math.abs(move.deltas[i]));
    }
    return t.triads.manyMove(move.moved);
  };

  const play = (v: TriadVoicing) => playStrum(STRING_SETS[set].map((string, i) => OPEN_MIDI[string] + v.frets[i]));

  const choose = (index: number) => {
    setSelected(index);
    if (result) play(result.path[index]);
  };

  const pickSong = (picked: Song) => update({ triadSongId: picked.id });
  const library = recentSongs(
    store.songs.filter((x) => chordsOfSong(x).length > 0),
    8,
  );

  const sheets = (
    <>
      <ChordEntrySheet
        visible={entering !== null}
        song={entering === 'edit' ? song : null}
        onClose={() => setEntering(null)}
        onDone={(saved) => {
          update({ triadSongId: saved.id });
          setEntering(null);
        }}
      />
      {voicing && triads[current] ? (
        <InversionsSheet
          visible={inversions}
          chord={triads[current]}
          label={labelOf(current)}
          set={set}
          proposed={voicing}
          zone={{ lo, hi }}
          flats={flats}
          onChoose={(chosenSet, chosen) => {
            if (chosenSet !== set) update({ stringSet: chosenSet });
            setPins((existing) => ({ ...(chosenSet !== set ? {} : existing), [current]: chosen }));
          }}
          onClose={() => setInversions(false)}
        />
      ) : null}
    </>
  );

  // Aucun chant : une invitation, et les chants déjà saisis.
  if (!song || !triads.length) {
    return (
      <View>
        <View style={s.cardGap}>
          <Card>
            <Text style={s.emptyTitle}>{t.triads.emptyTitle}</Text>
            <Text style={ui.hint}>{t.triads.emptyBody}</Text>
            <View style={s.cardAction}>
              <PrimaryButton label={t.triads.enter} onPress={() => setEntering('new')} />
            </View>
          </Card>
        </View>
        <SectionHeader>{t.triads.pickSong}</SectionHeader>
        {library.length ? (
          <ChipRow>
            {library.map((x) => (
              <Chip key={x.id} label={x.title || t.triads.untitled} onPress={() => pickSong(x)} />
            ))}
          </ChipRow>
        ) : (
          <Text style={ui.hint}>{t.triads.noSongs}</Text>
        )}
        {sheets}
      </View>
    );
  }

  const unsupported = entries.filter((e) => !e.triad);
  const simplified = chain.filter((e) => e.simplified);

  return (
    <View>
      <View style={s.songRow}>
        <View style={s.songText}>
          <Text style={s.songTitle} numberOfLines={1}>
            {song.title || t.triads.untitled}
          </Text>
          <Text style={ui.hint}>
            {chordName(song.defaultKey, chordById('maj'), notation, prefersFlats(song.defaultKey))}
            {song.capo ? ` · ${t.entry.capo} ${song.capo}` : ''}
          </Text>
        </View>
        <SecondaryButton label={t.triads.edit} onPress={() => setEntering('edit')} />
      </View>
      {library.length > 1 ? (
        <ChipRow>
          {library.map((x) => (
            <Chip key={x.id} label={x.title || t.triads.untitled} selected={x.id === song.id} onPress={() => pickSong(x)} />
          ))}
          <Chip label={`+ ${t.triads.enter}`} onPress={() => setEntering('new')} />
        </ChipRow>
      ) : null}

      <SectionHeader>{t.triads.chords}</SectionHeader>
      <ChipRow>
        {triads.map((_, index) => (
          <Chip
            key={`${index}-${labelOf(index)}`}
            label={labelOf(index)}
            selected={index === current}
            onPress={() => choose(index)}
          />
        ))}
      </ChipRow>

      {result && voicing ? (
        <>
          <View style={s.cardGap}>
            <Card>
              <Text style={s.chordName}>{labelOf(current)}</Text>
              <Text style={ui.hint}>
                {t.triads.inversion[voicing.inversion]} · {t.triads.fretsOf(...voicingRange(voicing))}
                {pins[current] ? ` · ${t.triads.chosen}` : ''}
              </Text>
              <View style={s.board}>
                <Fretboard
                  markers={triadMarkers(triads[current], set, voicing.frets, settings.display, notation, flats)}
                  focusFret={Math.max(0, voicingRange(voicing)[0] - 1)}
                />
              </View>
              {movementText() ? <Text style={s.movement}>{movementText()}</Text> : null}
            </Card>
          </View>
          <Text style={s.total}>{t.triads.total(result.total)}</Text>
          <View style={s.actions}>
            <PrimaryButton label={t.triads.listen} onPress={() => play(voicing)} />
            <SecondaryButton label={t.triads.allInversions(labelOf(current))} onPress={() => setInversions(true)} />
            {pins[current] ? (
              <SecondaryButton
                label={t.triads.unpin}
                onPress={() =>
                  setPins((existing) => {
                    const { [current]: _removed, ...rest } = existing;
                    return rest;
                  })
                }
              />
            ) : null}
          </View>
        </>
      ) : (
        <View style={s.cardGap}>
          <Card>
            {gaps.map((index) => (
              <Text key={index} style={s.warning}>
                {t.triads.noShape(labelOf(index))}
              </Text>
            ))}
          </Card>
        </View>
      )}

      <SectionHeader>{`${t.triads.zone} · ${t.triads.zoneFrets(lo, hi)}`}</SectionHeader>
      <Stepper
        label={t.triads.fromFret}
        value={lo}
        min={0}
        max={hi - MIN_ZONE}
        onChange={(zoneLo) => update({ zoneLo })}
        format={(v) => String(v)}
      />
      <Stepper
        label={t.triads.toFret}
        value={hi}
        min={lo + MIN_ZONE}
        max={FRET_COUNT}
        onChange={(zoneHi) => update({ zoneHi })}
        format={(v) => String(v)}
      />
      <SectionHeader>{t.triads.stringSetLabel}</SectionHeader>
      <ChipRow>
        {STRING_SET_IDS.map((id) => (
          <Chip key={id} label={t.triads.stringSets[id]} selected={id === set} onPress={() => update({ stringSet: id })} />
        ))}
      </ChipRow>

      {simplified.map((entry) => (
        <Text key={`s${entry.index}`} style={ui.hint}>
          {t.triads.simplified(enteredLabel(entry.index), labelOf(chain.indexOf(entry)))}
        </Text>
      ))}
      {unsupported.map((entry) => (
        <Text key={`u${entry.index}`} style={ui.hint}>
          {t.triads.unsupported(enteredLabel(entry.index))}
        </Text>
      ))}
      {song.capo ? <Text style={ui.hint}>{t.triads.capoNote(song.capo)}</Text> : null}

      {sheets}
    </View>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    cardGap: { marginTop: space.lg },
    cardAction: { marginTop: space.md },
    emptyTitle: { ...type.cardTitle, color: c.label },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.lg },
    songText: { flex: 1, paddingRight: space.md },
    songTitle: { ...type.section, color: c.label },
    chordName: { ...type.chordName, color: c.label },
    board: { marginTop: space.md },
    movement: { ...type.subhead, color: c.accent, marginTop: space.md },
    total: { ...type.caption, color: c.secondary, textAlign: 'center', marginTop: space.md },
    actions: { gap: space.md, paddingHorizontal: space.lg, marginTop: space.lg },
    warning: { ...type.body, color: c.destructive, marginTop: space.xs },
  });
