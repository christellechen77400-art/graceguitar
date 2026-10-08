import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Card,
  Chip,
  ChipRow,
  KeyPicker,
  ListRow,
  PrimaryButton,
  Screen,
  SectionHeader,
  useTextStyles,
} from '../components/ui';
import { Fretboard, Marker } from '../components/Fretboard';
import { formatDay } from '../i18n';
import { Question, setChordRun } from '../practice/engine';
import { emptySong, setChords, Song, WorshipSet } from '../songs/model';
import { songFromChordPro } from '../songs/import';
import { nextSet, recentSongs } from '../songs/library';
import { readSharedLink, SharedSet } from '../songs/share';
import { FEATURE_CHURCH_SYNC } from '../config';
import { SET_SOURCES } from '../songs/sources';
import { useSongs } from '../songs/store';
import { useSettings } from '../state/settings';
import { NECK, Theme, useStyles, useTheme } from '../theme';
import { chordById, chordName, chordToneLabel } from '../theory/chords';
import { mod12, noteName, pcAt, prefersFlats } from '../theory/notes';
import { generateVoicings, voicingTab } from '../theory/voicings';
import { capoOptions, COMMON_WORSHIP_KEYS, DIATONIC, PROGRESSIONS, suggestCapo } from '../theory/worship';
import { HelpLink } from '../components/guideBits';
import { useNav } from '../navigation';
import { ChordEntrySheet } from './ChordEntrySheet';
import { RunScreen } from './Run';
import { GridEditor } from './songs/GridEditor';
import { ImportSet } from './songs/ImportSet';
import { PasteChart } from './songs/PasteChart';
import { SetSheet } from './songs/SetSheet';
import { ShareSet } from './songs/ShareSet';
import { SongPicker } from './songs/SongPicker';
import { SongSheet } from './songs/SongSheet';

/**
 * L'onglet Louange : mes chants, mes sets, et l'outil de tonalité.
 *
 * L'ordre est celui d'un dimanche qui approche : le set à préparer d'abord, puis
 * la bibliothèque pour le remplir, et l'outil de tonalité en dessous — il sert
 * quand on hésite sur un accord, pas quand on prépare un culte.
 *
 * Une seule feuille est ouverte à la fois : c'est ce qui rend lisible l'enchaînement
 * set → chant → grille, et ce qui évite qu'une feuille se referme sur une autre.
 */
type Open =
  | { kind: 'set'; set: WorshipSet }
  | { kind: 'song'; song: Song; setId: string | null; capo: number }
  | { kind: 'grid'; song: Song }
  | { kind: 'paste'; song: Song }
  | { kind: 'share'; set: WorshipSet }
  | { kind: 'import' }
  | { kind: 'enter' }
  | { kind: 'newSong' };

export function WorshipScreen() {
  const { settings, notation, t, update } = useSettings();
  const songs = useSongs();
  const nav = useNav();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const { c } = useTheme();
  const [selected, setSelected] = useState(0);
  const [progIndex, setProgIndex] = useState(0);
  const [open, setOpen] = useState<Open | null>(null);
  const [incoming, setIncoming] = useState<SharedSet | null>(null);
  const [allSongs, setAllSongs] = useState(false);
  const [run, setRun] = useState<Question[] | null>(null);

  // Un lien `gccguitare://import?d=…` ouvre l'aperçu du set reçu. Sous Expo Go le
  // schéma n'est pas enregistré : le collage à la main reste le chemin normal, et
  // celui-ci fonctionne dès qu'un build de développement existe.
  useEffect(() => {
    const show = (url: string | null) => {
      const shared = url ? readSharedLink(url) : null;
      if (!shared) return;
      setIncoming(shared);
      setOpen({ kind: 'import' });
    };
    Linking.getInitialURL()
      .then(show)
      .catch(() => {});
    const sub = Linking.addEventListener('url', (event) => show(event.url));
    return () => sub.remove();
  }, []);

  if (run) return <RunScreen questions={run} onExit={() => setRun(null)} />;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = nextSet(songs.sets, today);
  const recent = recentSongs(songs.songs, allSongs ? songs.songs.length : 5);

  const key = settings.keyRoot;
  const flats = prefersFlats(key);
  const nameInKey = (k: number, i: number) => {
    const d = DIATONIC[i];
    return chordName(mod12(k + d.degree), chordById(d.type), notation, prefersFlats(k));
  };

  const d = DIATONIC[selected];
  const chordRoot = mod12(key + d.degree);
  const chord = chordById(d.type);
  const voicing = generateVoicings(chordRoot, chord)[0];

  const markers: Marker[] = voicing
    ? voicing.frets.flatMap((fret, string) => {
        if (fret === null) return [];
        const pc = pcAt(string, fret);
        const label =
          settings.display === 'intervals'
            ? chordToneLabel(chord, chordRoot, pc)
            : settings.display === 'notes'
              ? noteName(pc, notation, flats)
              : undefined;
        return [{ string, fret, kind: pc === chordRoot ? 'root' : 'chord', label } as Marker];
      })
    : [];
  const muted = voicing ? voicing.frets.map((f, string) => (f === null ? string : -1)).filter((string) => string >= 0) : [];
  const progression = PROGRESSIONS[progIndex];

  /** La tonalité du jour d'un chant : celle du set s'il y est, la sienne sinon. */
  const entryOf = (setId: string | null, song: Song) =>
    setId ? songs.sets.find((x) => x.id === setId)?.songs.find((e) => e.songId === song.id) : undefined;

  const openSong = (song: Song, setId: string | null = null) => {
    const entry = entryOf(setId, song);
    setOpen({
      kind: 'song',
      song,
      setId,
      capo: entry?.capo ?? suggestCapo(entry?.key ?? song.defaultKey, settings.preferredShapes),
    });
  };

  return (
    <Screen tab="sunday" title={t.tabs.sunday}>
      <SectionHeader>{t.worship.nextSet}</SectionHeader>
      {upcoming ? (
        <Card>
          <Text style={s.cardTitle}>{upcoming.serviceName || t.sets.untitled}</Text>
          <Text style={ui.hint}>
            {formatDay(upcoming.date, t)} · {t.worship.songCount(upcoming.songs.length)}
          </Text>
          {upcoming.songs.length ? (
            <Text style={s.ready}>{t.worship.readyToPlay}</Text>
          ) : (
            <Text style={ui.hint}>{t.worship.addSongsForSunday}</Text>
          )}
          <View style={s.cardActions}>
            <PrimaryButton label={t.worship.openSet} onPress={() => setOpen({ kind: 'set', set: upcoming })} />
            {upcoming.songs.length ? (
              <Pressable
                onPress={() => {
                  const chords = setChords(upcoming, songs.songs);
                  if (chords.length) setRun(setChordRun(chords));
                }}
                accessibilityRole="button"
                style={s.cardLink}
              >
                <Text style={s.cardLinkText}>{t.worship.startSet}</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={ui.hint}>{t.worship.noSets}</Text>
          <View style={s.cardActions}>
            <PrimaryButton
              label={t.sets.newSet}
              onPress={() => setOpen({ kind: 'set', set: songs.createSet() })}
            />
          </View>
        </Card>
      )}

      <SectionHeader action={{ label: t.sets.newSet, onPress: () => setOpen({ kind: 'set', set: songs.createSet() }) }}>
        {t.worship.mySets}
      </SectionHeader>
      {songs.sets.map((set, i) => (
        <ListRow
          key={set.id}
          title={set.serviceName || t.sets.untitled}
          subtitle={formatDay(set.date, t)}
          value={t.worship.songCount(set.songs.length)}
          chevron
          onPress={() => setOpen({ kind: 'set', set })}
          last={i === songs.sets.length - 1}
        />
      ))}

      <SectionHeader
        action={{ label: allSongs ? t.close : t.worship.seeAll, onPress: () => setAllSongs(!allSongs) }}
      >
        {t.worship.mySongs}
      </SectionHeader>
      {!songs.songs.length ? <Text style={ui.hint}>{t.worship.noSongs}</Text> : null}
      {recent.map((song, i) => (
        <ListRow
          key={song.id}
          title={song.title}
          subtitle={`${t.key} ${noteName(song.defaultKey, notation, prefersFlats(song.defaultKey))}`}
          chevron
          onPress={() => openSong(song)}
          last={i === recent.length - 1}
        />
      ))}
      <ChipRow>
        <Chip label={t.triads.enter} onPress={() => setOpen({ kind: 'enter' })} />
        <Chip label={t.worship.quickAdd} onPress={() => setOpen({ kind: 'newSong' })} />
        <Chip label={t.worship.pasteChart} onPress={() => setOpen({ kind: 'paste', song: emptySong('', key) })} />
        <Chip label={t.worship.importSet} onPress={() => setOpen({ kind: 'import' })} />
      </ChipRow>

      {FEATURE_CHURCH_SYNC ? (
        <>
      <SectionHeader>{t.sets.sources}</SectionHeader>
          <Text style={ui.hint}>{t.sets.sourceHint}</Text>
          {/* Les sources d'équipe sont annoncées, pas proposées : une ligne grisée et
              son sous-titre disent « prévu » sans promettre un badge coloré que rien
              ne viendrait remplir. */}
          {SET_SOURCES.filter((source) => source.id !== 'manual').map((source, i, all) => (
            <ListRow
              key={source.id}
              title={t.sets.source[source.id]}
              subtitle={source.available ? undefined : t.sets.comingSoon}
              muted={!source.available}
              last={i === all.length - 1}
            />
          ))}
        </>
      ) : null}

      <KeyPicker label={t.key} highlight={COMMON_WORSHIP_KEYS} />
      <Text style={[ui.hint, s.keyHint]}>{t.worship.commonKeyHint}</Text>

      <SectionHeader>{t.worship.diatonic}</SectionHeader>
      <Text style={ui.hint}>{t.worship.diatonicHint}</Text>
      <View style={s.grid}>
        {DIATONIC.map((dc, i) => (
          <Pressable
            key={dc.roman}
            onPress={() => setSelected(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === i }}
            style={[s.cell, selected === i && s.cellActive]}
          >
            <Text style={[s.cellName, selected === i && s.inkText]}>{nameInKey(key, i)}</Text>
            <Text style={[s.cellNum, selected === i && s.inkText]}>{dc.nashville}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.block}>
        <Fretboard markers={markers} muted={muted} focusFret={voicing?.minFret} />
        {voicing && <Text style={s.tab}>{voicingTab(voicing)}</Text>}
      </View>

      <SectionHeader>{t.worship.progressions}</SectionHeader>
      {PROGRESSIONS.map((p, i) => (
        <Pressable
          key={p.join('-')}
          onPress={() => setProgIndex(i)}
          accessibilityRole="button"
          accessibilityState={{ selected: progIndex === i }}
          style={[s.row, progIndex === i && s.rowActive]}
        >
          <Text style={s.rowNums}>{p.map((x) => DIATONIC[x].nashville).join('  ')}</Text>
          <Text style={s.rowNames}>{p.map((x) => nameInKey(key, x)).join('  ')}</Text>
        </Pressable>
      ))}

      <SectionHeader>{t.worship.capo}</SectionHeader>
      <Text style={ui.hint}>{t.worship.capoHint}</Text>
      {capoOptions(key).map((option) => (
        <View key={option.shapeKey} style={s.row}>
          <Text style={s.rowNums}>{t.worship.capoRow(option.capo, noteName(option.shapeKey, notation, false))}</Text>
          <Text style={s.rowNames}>{progression.map((x) => nameInKey(option.shapeKey, x)).join('  ')}</Text>
        </View>
      ))}

      <SetSheet
        set={open?.kind === 'set' ? open.set : null}
        visible={open?.kind === 'set'}
        onClose={() => setOpen(null)}
        onOpenSong={(song) => openSong(song, open?.kind === 'set' ? open.set.id : null)}
        onShare={() => open?.kind === 'set' && setOpen({ kind: 'share', set: open.set })}
      />

      <SongSheet
        song={open?.kind === 'song' ? open.song : null}
        dayKey={
          open?.kind === 'song'
            ? (entryOf(open.setId, open.song)?.key ?? open.song.defaultKey)
            : 0
        }
        capo={open?.kind === 'song' ? open.capo : 0}
        onClose={() => setOpen(null)}
        onKey={(next) => {
          if (open?.kind !== 'song') return;
          if (open.setId) songs.updateInSet(open.setId, open.song.id, { key: next });
          else songs.updateSong(open.song.id, { defaultKey: next });
        }}
        onCapo={(next) => {
          if (open?.kind !== 'song') return;
          if (open.setId) songs.updateInSet(open.setId, open.song.id, { capo: next });
          setOpen({ ...open, capo: next });
        }}
        onTriads={() => {
          if (open?.kind !== 'song') return;
          update({ triadSongId: open.song.id });
          setOpen(null);
          nav.openLayer('triads');
        }}
        onGrid={() => open?.kind === 'song' && setOpen({ kind: 'grid', song: open.song })}
        onPaste={() => open?.kind === 'song' && setOpen({ kind: 'paste', song: open.song })}
      />

      <GridEditor
        key={open?.kind === 'grid' ? open.song.id : 'grid'}
        visible={open?.kind === 'grid'}
        title={open?.kind === 'grid' ? open.song.title : ''}
        sections={open?.kind === 'grid' ? (open.song.sections ?? []) : []}
        songKey={open?.kind === 'grid' ? open.song.defaultKey : key}
        mode={open?.kind === 'grid' ? open.song.mode : 'major'}
        onClose={() => setOpen(null)}
        onSave={(sections) => {
          if (open?.kind !== 'grid') return;
          songs.updateSong(open.song.id, { sections: sections.length ? sections : undefined });
          setOpen(null);
        }}
      />

      <PasteChart
        key={open?.kind === 'paste' ? open.song.id : 'paste'}
        visible={open?.kind === 'paste'}
        onClose={() => setOpen(null)}
        onImport={(text) => {
          if (open?.kind !== 'paste') return;
          const read = songFromChordPro(text, open.song.title || t.sets.untitled);
          const fields = {
            title: read.title,
            defaultKey: read.defaultKey,
            mode: read.mode,
            sections: read.sections,
            tempo: read.tempo,
            lyrics: read.lyrics,
          };
          // A chart pasted on its own becomes a new song; one pasted over an
          // existing song replaces what it describes, and nothing else.
          if (songs.songs.some((song) => song.id === open.song.id)) songs.updateSong(open.song.id, fields);
          else songs.addSong({ ...open.song, ...fields });
          setOpen(null);
        }}
      />

      <ShareSet set={open?.kind === 'share' ? open.set : null} visible={open?.kind === 'share'} onClose={() => setOpen(null)} />

      <ImportSet
        key={incoming ? incoming.d : 'paste-link'}
        incoming={incoming}
        visible={open?.kind === 'import'}
        onClose={() => {
          setIncoming(null);
          setOpen(null);
        }}
        onDone={() => {
          setIncoming(null);
          setOpen(null);
        }}
      />

      <ChordEntrySheet
        key={open?.kind === 'enter' ? 'enter' : 'idle'}
        visible={open?.kind === 'enter'}
        song={null}
        onClose={() => setOpen(null)}
        onDone={(saved) => {
          update({ triadSongId: saved.id });
          setOpen(null);
          nav.openLayer('triads');
        }}
      />

      <SongPicker
        key={open?.kind === 'newSong' ? 'new' : 'idle'}
        visible={open?.kind === 'newSong'}
        onClose={() => setOpen(null)}
        onAdd={(song) => {
          songs.addSong(song);
          setOpen(null);
        }}
      />
      <HelpLink screen="dimanche" tab="sunday" originLabel={t.tabs.sunday} />
    </Screen>
  );
}

const makeStyles = ({ c, type, space, radius }: Theme) =>
  StyleSheet.create({
    cardTitle: { ...type.cardTitle, color: c.label },
    ready: { ...type.subhead, color: c.accent, marginTop: space.xs },
    cardActions: { marginTop: space.md },
    cardLink: { marginTop: space.md, minHeight: 24, justifyContent: 'center' },
    cardLinkText: { ...type.body, color: c.accent },
    keyHint: { marginTop: space.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, gap: space.sm },
    cell: {
      width: '23%',
      minWidth: 72,
      paddingVertical: space.sm,
      borderRadius: radius.chip,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      alignItems: 'center',
    },
    // The chosen cell is filled **and** outlined: the fill alone would be a
    // difference of colour, which is no difference at all to some readers.
    cellActive: { backgroundColor: c.accent, borderColor: NECK.nut, borderWidth: 2 },
    cellName: { ...type.cardTitle, color: c.label },
    cellNum: { ...type.caption, color: c.secondary, marginTop: 2 },
    inkText: { color: c.onAccent },
    tab: {
      ...type.subhead,
      color: c.secondary,
      textAlign: 'center',
      letterSpacing: 2,
      marginTop: space.xs,
      fontWeight: '600',
    },
    block: { marginTop: space.lg },
    row: {
      marginHorizontal: space.lg,
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    rowActive: { backgroundColor: c.card, borderRadius: radius.icon, borderLeftColor: c.accent },
    rowNums: { ...type.caption, color: c.secondary },
    rowNames: { ...type.cardTitle, color: c.label, marginTop: 2 },
  });
