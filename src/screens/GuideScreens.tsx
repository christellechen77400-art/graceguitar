import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TipSheet } from '../components/guideBits';
import { Card, ListRow, Screen, SecondaryButton, SectionHeader, useTextStyles } from '../components/ui';
import { guideSection, guideSections } from '../content/guide';
import { Tip, tipsByGroup } from '../content/tips';
import { GuideOrigin } from '../navigation';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';

/**
 * Le guide d'utilisation : la liste des sections, puis une section.
 *
 * Quand on y arrive par un lien « Comment ça marche », `origin` dit d'où l'on
 * vient et le bouton du haut ramène exactement là.
 */
export function GuideScreen({
  section,
  origin,
  onSection,
  onBackToOrigin,
  onClose,
}: {
  section: string | null;
  origin: GuideOrigin | null;
  onSection: (id: string | null) => void;
  onBackToOrigin: () => void;
  onClose: () => void;
}) {
  const { settings, t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const current = section ? guideSection(settings.lang, section) : undefined;

  return (
    <Screen
      tab="me"
      title={current ? current.title : t.guide.title}
      action={origin ? undefined : { label: t.me.title, onPress: current ? () => onSection(null) : onClose }}
    >
      {origin ? (
        <View style={s.actions}>
          <SecondaryButton label={t.guide.back(origin.label)} onPress={onBackToOrigin} />
        </View>
      ) : null}
      {current ? (
        <>
          <View style={s.body}>
            {current.body.map((paragraph, index) => (
              <Text key={index} style={s.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
          <View style={s.actions}>
            <SecondaryButton label={t.guide.toGuide} onPress={() => onSection(null)} />
          </View>
        </>
      ) : (
        <>
          <Text style={ui.hint}>{t.guide.hint}</Text>
          <View style={s.list}>
            {guideSections(settings.lang).map((item, index, all) => (
              <ListRow key={item.id} title={item.title} chevron last={index === all.length - 1} onPress={() => onSection(item.id)} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

/** « Tous les tips » : les treize, rangés par groupe. */
export function TipsScreen({ onClose }: { onClose: () => void }) {
  const { settings, t } = useSettings();
  const ui = useTextStyles();
  const [open, setOpen] = useState<Tip | null>(null);
  const groups = tipsByGroup(settings.lang);

  return (
    <Screen tab="me" title={t.tips.all} action={{ label: t.me.title, onPress: onClose }}>
      <Text style={ui.hint}>{t.tips.allHint}</Text>
      {groups.map((group) => (
        <View key={group.group}>
          <SectionHeader>{(t.tips.groups as Record<string, string>)[group.group] ?? group.group}</SectionHeader>
          <Card>
            {group.tips.map((tip, index) => (
              <ListRow
                key={tip.id}
                title={tip.title}
                subtitle={tip.memo}
                chevron
                last={index === group.tips.length - 1}
                onPress={() => setOpen(tip)}
              />
            ))}
          </Card>
        </View>
      ))}
      <TipSheet tip={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    body: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.md },
    paragraph: { ...type.body, color: c.label },
    actions: { marginHorizontal: space.lg, marginTop: space.xl },
    list: { marginTop: space.lg },
  });
