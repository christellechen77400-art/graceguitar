import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip, ChipRow, PrimaryButton, SectionHeader, Sheet, useTextStyles } from '../../components/ui';
import { sectionLabel } from '../../i18n';
import { Section, SECTION_NAMES } from '../../songs/model';
import { useSettings } from '../../state/settings';
import { Theme, useStyles, useTheme } from '../../theme';
import { BASS_DEGREES, EDITOR_DEGREES, freeChordToNashville, Mode, withBass } from '../../theory/nashville';

/**
 * La saisie d'une grille, une section à la fois.
 *
 * Le clavier est celui d'une grille de louange : sept degrés, une basse, et un
 * accord libre pour ce qui ne se dit pas en degrés. Chaque toucher ajoute une
 * mesure — on écrit une grille en la jouant, pas en remplissant un formulaire.
 *
 * La section affichée est la seule modifiable : c'est ce qui permet de vider, de
 * dupliquer et de supprimer « la section » sans ambiguïté, et de garder l'écran
 * lisible même sur une grille de six sections.
 */
export function GridEditor({
  visible,
  title,
  sections: initial,
  songKey,
  mode,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  sections: Section[];
  songKey: number;
  mode: Mode;
  onClose: () => void;
  onSave: (sections: Section[]) => void;
}) {
  const { t } = useSettings();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [sections, setSections] = useState<Section[]>(initial);
  const [index, setIndex] = useState(0);
  const [bass, setBass] = useState(false);
  const [free, setFree] = useState(false);
  const [chordText, setChordText] = useState('');
  const [nameText, setNameText] = useState('');
  const [naming, setNaming] = useState(false);

  const current = sections[index];
  const bars = current?.bars ?? [];

  const patch = (change: (bars: string[]) => string[]) =>
    setSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, bars: change(section.bars) } : section)),
    );

  /** Un degré touché : une mesure de plus, ou la basse de la dernière. */
  const tapDegree = (degree: string) => {
    if (bass) {
      if (!bars.length) return;
      patch((list) => [...list.slice(0, -1), withBass(list[list.length - 1], degree)]);
      setBass(false);
      return;
    }
    patch((list) => [...list, degree]);
  };

  const addFree = () => {
    const degree = freeChordToNashville(chordText, songKey, mode);
    if (!degree) return;
    patch((list) => [...list, degree]);
    setChordText('');
    setFree(false);
  };

  const addSection = (name: string) => {
    setSections((prev) => [...prev, { name, bars: [] }]);
    setIndex(sections.length);
    setNameText('');
    setNaming(false);
  };

  const duplicate = () => {
    if (!current) return;
    setSections((prev) => [
      ...prev.slice(0, index + 1),
      { name: current.name, bars: [...bars] },
      ...prev.slice(index + 1),
    ]);
    setIndex(index + 1);
  };

  const removeSection = () => {
    if (!current) return;
    setSections((prev) => prev.filter((_, i) => i !== index));
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const save = () => {
    // A section with no bars is a section someone started and left: keeping it
    // would put an empty heading on the sheet.
    onSave(sections.filter((section) => section.bars.length > 0));
  };

  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={<PrimaryButton label={t.sets.save} onPress={save} />}
    >
      <ChipRow>
        {sections.map((section, i) => (
          <Chip
            key={`${section.name}-${i}`}
            label={sectionLabel(section.name, t)}
            selected={i === index}
            onPress={() => {
              setIndex(i);
              setBass(false);
            }}
          />
        ))}
        <Chip label={t.worship.newSection} onPress={() => setNaming(true)} />
      </ChipRow>

      {naming ? (
        <>
          <ChipRow>
            {SECTION_NAMES.map((name) => (
              <Chip key={name} label={sectionLabel(name, t)} onPress={() => addSection(name)} />
            ))}
          </ChipRow>
          <TextInput
            value={nameText}
            onChangeText={setNameText}
            onSubmitEditing={() => nameText.trim() && addSection(nameText.trim())}
            placeholder={t.worship.sectionFree}
            placeholderTextColor={c.secondary}
            style={s.input}
            accessibilityLabel={t.worship.sectionName}
          />
        </>
      ) : null}

      <View style={s.paper}>
        {bars.length ? (
          <View style={s.bars}>
            {bars.map((bar, i) => (
              <Chip
                key={`${bar}-${i}`}
                label={bar}
                selected={i === bars.length - 1}
                onPress={() => patch((list) => list.filter((_, j) => j !== i))}
              />
            ))}
          </View>
        ) : (
          <Text style={ui.hint}>{t.worship.addBar}</Text>
        )}
      </View>

      {bass ? (
        <>
          <SectionHeader>{t.worship.bass}</SectionHeader>
          <ChipRow>
            {BASS_DEGREES.map((degree) => (
              <Chip key={degree} label={`/${degree}`} onPress={() => tapDegree(degree)} />
            ))}
          </ChipRow>
        </>
      ) : (
        <ChipRow>
          {EDITOR_DEGREES.map((degree) => (
            <Chip key={degree} label={degree} onPress={() => tapDegree(degree)} />
          ))}
        </ChipRow>
      )}

      {free ? (
        <View>
          <TextInput
            value={chordText}
            onChangeText={setChordText}
            onSubmitEditing={addFree}
            placeholder={t.worship.otherChord}
            placeholderTextColor={c.secondary}
            autoCapitalize="characters"
            style={s.input}
            accessibilityLabel={t.worship.otherChord}
          />
          <ChipRow>
            <Chip label={t.worship.addBar} onPress={addFree} disabled={!chordText.trim()} />
            <Chip label={t.cancel} onPress={() => setFree(false)} />
          </ChipRow>
        </View>
      ) : (
        <ChipRow>
          <Chip label={t.worship.bass} selected={bass} onPress={() => setBass(!bass)} />
          <Chip label={t.worship.other} onPress={() => setFree(true)} />
          <Chip label="⌫" onPress={() => patch((list) => list.slice(0, -1))} disabled={!bars.length} />
        </ChipRow>
      )}

      <ChipRow>
        <Chip label={t.worship.duplicate} onPress={duplicate} disabled={!current} />
        <Chip label={t.worship.clearSection} onPress={() => patch(() => [])} disabled={!bars.length} />
        <Chip label={t.worship.removeSection} onPress={removeSection} disabled={!current} />
      </ChipRow>
    </Sheet>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    paper: { paddingHorizontal: space.lg, paddingVertical: space.sm },
    bars: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: -space.sm },
    input: {
      ...type.subhead,
      color: c.label,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      borderRadius: radius.chip,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      marginHorizontal: space.lg,
      marginBottom: space.sm,
      minHeight: size.touch,
    },
  });
