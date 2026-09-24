import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotePlayer } from '../audio/useNotePlayer';
import { Fretboard } from '../components/Fretboard';
import { PersonIcon } from '../components/icons';
import { SessionCard } from '../components/SessionCard';
import { StreakPill } from '../components/StreakPill';
import {
  Card,
  Chip,
  ChipRow,
  PrimaryButton,
  Screen,
  SecondaryButton,
  useTextStyles,
} from '../components/ui';
import { bestTime, challengeOfWeek } from '../home/challenge';
import { dayPart, greetingName, seedOf, weekStrip } from '../home/day';
import { notionOfDay } from '../home/notion';
import { homeSections, HomeSection, isSundayMode, SUNDAY_QUESTIONS } from '../home/order';
import { syncSundayReminder } from '../home/notifications';
import { weekMinutes } from '../home/stats';
import { dailySession } from '../practice/daily';
import {
  ExerciseId,
  heat,
  heatMarkers,
  makeRun,
  neckTotals,
  Question,
  setChordRun,
  streak,
  voiceChord,
} from '../practice/engine';
import { formatDayTitle } from '../i18n';
import { setSourceLabel, songLine } from '../songs/labels';
import { nextSet } from '../songs/library';
import { setChords, setSongs, Song, today as todayIso, WorshipSet } from '../songs/model';
import { useSongs } from '../songs/store';
import { useSettings } from '../state/settings';
import { tabularNums, Theme, useStyles, useTheme } from '../theme';
import { boardMarkers, LessonId } from '../theory/lessons';
import { noteName, prefersFlats } from '../theory/notes';
import { suggestCapo } from '../theory/worship';
import { LessonsPanel } from './LessonsPanel';
import { RunScreen } from './Run';
import { SongStage } from './SongStage';
import { SpaceSheet } from './SpaceSheet';
import { Grid } from './songs/Grid';

/**
 * L'accueil « Aujourd'hui ».
 *
 * Il change d'ordre selon le jour, parce que la semaine d'un musicien de louange
 * change : du lundi au mercredi on travaille, le jeudi on prépare, le dimanche on
 * joue. L'ordre lui-même est une règle pure (`src/home/order.ts`) ; ici on ne fait
 * que la suivre.
 *
 * L'accordeur n'y est plus : il vit dans l'onglet Exercices et dans Mon espace.
 */
export function TodayScreen() {
  const { settings, notation, t } = useSettings();
  const songs = useSongs();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const { c } = useTheme();

  const [run, setRun] = useState<Question[] | null>(null);
  const [space, setSpace] = useState(false);
  const [lesson, setLesson] = useState<LessonId | null>(null);
  const [stage, setStage] = useState<{ song: Song; set: WorshipSet; key: number; capo: number } | null>(null);

  const iso = todayIso();
  const day = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  const sunday = isSundayMode(day);
  const upcoming = nextSet(songs.sets, iso);
  // Deux questions différentes : y a-t-il un set à montrer — c'est ce qui décide
  // de sa place — et a-t-il des chants, ce que le rappel du jeudi veut savoir.
  const hasSet = Boolean(upcoming);
  const hasSongs = Boolean(upcoming?.songs.length);

  const session = useMemo(
    () =>
      dailySession(settings.practice, settings.progress, seedOf(iso), sunday ? SUNDAY_QUESTIONS : undefined),
    [settings.practice, settings.progress, iso, sunday],
  );
  const cells = useMemo(() => heat(settings.practice, settings.progress), [settings.practice, settings.progress]);
  const totals = useMemo(() => neckTotals(settings.progress), [settings.progress]);
  const days = streak(settings.practiceDays, iso);
  const week = weekStrip(settings.practiceDays, iso);
  const notion = notionOfDay(iso);
  const challenge = challengeOfWeek(iso);
  const best = bestTime(settings.runs, challenge);
  const practised = cells.filter((cell) => cell.attempts > 0);

  // Ce qui a déjà été fait aujourd'hui : la séance est découpée en exercices, et
  // chacun se coche quand une séance du jour l'a porté.
  const doneToday = new Set<ExerciseId>(
    settings.runs.filter((record) => record.day === iso).flatMap((record) => record.exercises),
  );

  useEffect(() => {
    syncSundayReminder(settings.reminders, hasSongs, t.today.reminder.title, t.today.reminder.body).catch(() => {});
  }, [settings.reminders, hasSongs, t]);

  if (run) return <RunScreen questions={run} onExit={() => setRun(null)} />;

  if (lesson) {
    return (
      <Screen tab="today" title={t.theory.title}>
        <LessonsPanel initial={lesson} onExit={() => setLesson(null)} />
      </Screen>
    );
  }

  if (stage) {
    return (
      <SongStage
        song={stage.song}
        set={stage.set}
        key={stage.key}
        capo={stage.capo}
        onClose={() => setStage(null)}
      />
    );
  }

  const openSet = () =>
    upcoming ? songs.sets.find((x) => x.id === upcoming.id) ?? upcoming : songs.createSet();

  const cards: Record<HomeSection, React.ReactNode> = {
    todaySession: (
      <SessionCard
        key="session"
        session={session}
        done={doneToday}
        sunday={sunday}
        onStart={(questions) => questions.length && setRun(questions)}
      />
    ),
    sundaySet: (
      <SetCard
        key="set"
        set={upcoming}
        sunday={sunday}
        onOpen={openSet}
        onStage={(song, key, capo) => upcoming && setStage({ song, set: upcoming, key, capo })}
        onPractice={() => {
          if (!upcoming) return;
          const chords = setChords(upcoming, songs.songs);
          if (chords.length) setRun(setChordRun(chords));
        }}
      />
    ),
    notionOfDay: (
      <NotionCard key="notion" notion={notion} onLesson={() => setLesson(notion.lesson)} />
    ),
    progress: (
      <ProgressCard key="progress" cells={cells} practised={practised.length} totals={totals} minutes={weekMinutes(settings.runs, iso)} />
    ),
    weeklyChallenge: (
      <Card key="challenge">
        <Text style={s.cardTitle}>{t.today.challenge}</Text>
        <Text style={ui.hint}>
          {t.practice.exercises[challenge.exercise]} · {t.today.questionCount(challenge.questions)}
        </Text>
        <Text style={s.figureLine}>
          {best === null ? t.today.challengeNone : t.today.challengeBest(best / 1000)}
        </Text>
        <View style={s.cardActions}>
          <SecondaryButton
            label={t.practice.start}
            onPress={() => setRun(makeRun(challenge.exercise, settings.practice, seedOf(`${iso}-${challenge.exercise}`)))}
          />
        </View>
      </Card>
    ),
  };

  return (
    <Screen tab="today">
      <View style={s.head}>
        <Text style={s.date}>{formatDayTitle(iso, t)}</Text>
        <View style={s.headRight}>
          <View style={s.pillGap}>
            <StreakPill days={days} />
          </View>
          <Pressable
            onPress={() => setSpace(true)}
            accessibilityRole="button"
            accessibilityLabel={t.today.space}
            style={s.space}
          >
            <PersonIcon color={c.label} size={20} />
          </Pressable>
        </View>
      </View>

      <Text style={s.greeting} accessibilityRole="header">
        {t.today.greeting(t.today[dayPart(new Date().getHours())], greetingName(settings.firstName))}
      </Text>

      <View style={s.week}>
        {week.map((cell, index) => (
          <View
            key={cell.iso}
            style={[s.dotRing, cell.today && s.dotRingToday]}
            accessibilityRole="text"
            accessibilityLabel={[t.date.days[index], cell.today ? t.today.weekToday : '', cell.done ? t.today.weekDone : '']
              .filter(Boolean)
              .join(', ')}
          >
            <View style={[s.dot, cell.done && s.dotDone]}>
              <Text style={[s.dotText, cell.done && s.dotTextDone]}>{cell.done ? '✓' : t.today.week[index]}</Text>
            </View>
          </View>
        ))}
      </View>

      {homeSections(day, hasSet).map((section) => cards[section])}

      <SpaceSheet visible={space} onClose={() => setSpace(false)} />
    </Screen>
  );
}

// --------------------------------------------------------------------- cartes

/**
 * Le set du dimanche.
 *
 * Vide, ce n'est pas une carte : c'est une ligne. Une grande carte vide en tête
 * d'écran donne l'impression que l'app n'a rien à dire, alors qu'il ne manque
 * qu'une chose — les chants.
 */
function SetCard({
  set,
  sunday,
  onOpen,
  onStage,
  onPractice,
}: {
  set: WorshipSet | null;
  sunday: boolean;
  onOpen: () => void;
  onStage: (song: Song, key: number, capo: number) => void;
  onPractice: () => void;
}) {
  const { t, notation, settings } = useSettings();
  const { songs } = useSongs();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();

  const list = set ? setSongs(set, songs) : [];

  if (!set || !list.length) {
    return (
      <View style={s.emptyLine}>
        <Pressable onPress={onOpen} accessibilityRole="button" style={s.emptyPress}>
          <Text style={s.emptyText}>{t.today.noSet}</Text>
          <Text style={s.chevron}>›</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Card>
      <Text style={s.cardTitle}>{sunday ? t.today.openedSet : t.sets.title}</Text>
      <Text style={ui.hint}>
        {formatDayTitle(set.date, t)}
        {set.serviceName ? ` · ${set.serviceName}` : ''} · {setSourceLabel(set, t)}
      </Text>

      {list.map(({ song, entry }) => {
        const sections = song.sections ?? [];
        const capo = entry.capo || suggestCapo(entry.key, settings.preferredShapes);
        return (
          <Pressable
            key={song.id}
            onPress={() => onStage(song, entry.key, entry.capo)}
            accessibilityRole="button"
            accessibilityLabel={`${song.title}, ${songLine(entry.key, entry.capo, notation, t)}`}
            style={s.song}
          >
            <View style={s.songHead}>
              <Text style={s.songTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <View style={s.keyPill}>
                <Text style={s.keyPillText}>{noteName(entry.key, notation, prefersFlats(entry.key))}</Text>
              </View>
            </View>
            <Text style={ui.hint}>
              {entry.capo ? `${t.sets.capo} ${entry.capo}` : t.today.suggested(capo)}
              {sections.length ? '' : ` · ${t.worship.keyOnly}`}
            </Text>
            {/* Le dimanche, on ne résume pas : on montre la grille. */}
            {sunday ? (
              <View style={s.songGrid}>
                {sections.length ? (
                  <Grid sections={sections} songKey={entry.key} mode={song.mode} view="chords" />
                ) : (
                  <Text style={ui.hint}>{t.worship.probable}</Text>
                )}
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {sunday ? <Text style={ui.hint}>{t.today.sundayHint}</Text> : null}

      <View style={s.cardActions}>
        <PrimaryButton label={t.worship.startSet} onPress={onPractice} />
      </View>
    </Card>
  );
}

/** La notion du jour : un nom, deux lignes, un accord à regarder, et la leçon. */
function NotionCard({ notion, onLesson }: { notion: ReturnType<typeof notionOfDay>; onLesson: () => void }) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const { playStrum } = useNotePlayer();
  const markers = useMemo(() => boardMarkers({ root: notion.root, chord: notion.chord }), [notion]);

  return (
    <Card>
      <Text style={s.cardTitle}>{t.today.notion}</Text>
      <Text style={s.notion}>{t.today.notions[notion.id].name}</Text>
      <Text style={ui.hint}>{t.today.notions[notion.id].hint}</Text>
      <View style={s.notionBoard}>
        <Fretboard markers={markers} />
      </View>
      <ChipRow>
        <Chip label={t.listen} onPress={() => playStrum(voiceChord(notion.root, notion.chord))} />
        <Chip label={t.today.seeLesson} onPress={onLesson} />
      </ChipRow>
    </Card>
  );
}

/** Ta progression : la carte de chaleur, sa légende, et trois chiffres. */
function ProgressCard({
  cells,
  practised,
  totals,
  minutes,
}: {
  cells: ReturnType<typeof heat>;
  practised: number;
  totals: ReturnType<typeof neckTotals>;
  minutes: number;
}) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();

  return (
    <Card>
      <Text style={s.cardTitle}>{t.today.progress}</Text>
      {practised ? (
        <>
          <Fretboard markers={heatMarkers(cells)} />
          <Text style={ui.hint}>{t.today.heatLegend}</Text>
          <View style={s.figures}>
            <Figure value={`${minutes}`} label={`${t.today.minutes} ${t.today.thisWeek}`} />
            <Figure value={`${Math.round(totals.accuracy * 100)} %`} label={t.today.accuracy} />
            <Figure value={`${(totals.meanMs / 1000).toFixed(1)} s`} label={t.today.meanTime} />
          </View>
        </>
      ) : (
        <Text style={ui.hint}>{t.today.progressEmpty}</Text>
      )}
    </Card>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.figure}>
      <Text style={s.figureValue}>{value}</Text>
      <Text style={s.figureLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      paddingTop: space.md,
    },
    date: { ...type.subhead, color: c.secondary, flexShrink: 1 },
    headRight: { flexDirection: 'row', alignItems: 'center' },
    pillGap: { marginRight: space.sm },
    space: {
      width: size.touch,
      height: size.touch,
      borderRadius: size.touch / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
    },
    greeting: { ...type.greeting, color: c.label, paddingHorizontal: space.lg, marginTop: space.sm },
    week: { flexDirection: 'row', paddingHorizontal: space.lg, marginTop: space.lg },
    // L'anneau est à l'extérieur du point : « aujourd'hui » est un état, pas une
    // quatrième couleur, et il se superpose à « jour pratiqué ».
    dotRing: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    dotRingToday: { borderColor: c.accent },
    dot: {
      // Une case du calendrier : ronde tant que le chiffre tient, et qui grandit
      // avec lui. Une taille fixe rognerait le jour au texte XL.
      minWidth: 32,
      minHeight: 32,
      borderRadius: 16,
      paddingHorizontal: space.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.separator,
    },
    dotDone: { backgroundColor: c.accent, borderColor: c.accent },
    dotText: { ...type.caption, color: c.secondary },
    dotTextDone: { color: c.onAccent, fontWeight: '600' },
                  cardTitle: { ...type.cardTitle, color: c.label },
    cardActions: { marginTop: space.md },
    emptyLine: { marginHorizontal: space.lg, marginTop: space.lg },
    emptyPress: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: size.row,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    emptyText: { ...type.body, color: c.accent, flex: 1 },
    chevron: { ...type.section, color: c.secondary },
    song: {
      paddingTop: space.md,
      marginTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
      minHeight: size.rowTwoLine,
    },
    songHead: { flexDirection: 'row', alignItems: 'center' },
    songTitle: { ...type.body, color: c.label, flex: 1 },
    keyPill: {
      minWidth: 34,
      alignItems: 'center',
      paddingHorizontal: space.sm,
      paddingVertical: 2,
      borderRadius: radius.chip,
      backgroundColor: c.accent,
      marginLeft: space.sm,
    },
    keyPillText: { ...type.caption, color: c.onAccent, fontWeight: '600' },
    songGrid: { marginTop: space.sm },
    notion: { ...type.notion, color: c.label, marginTop: space.xs },
    notionBoard: { marginTop: space.md },
    figures: { flexDirection: 'row', marginTop: space.md },
    figure: { flex: 1 },
    figureValue: { ...type.section, ...tabularNums, color: c.label },
    figureLabel: { ...type.caption, color: c.secondary },
    figureLine: { ...type.subhead, ...tabularNums, color: c.label, marginTop: space.sm },
  });
