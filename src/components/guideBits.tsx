/**
 * Les trois petits éléments qui expliquent : le « i » (Comprendre), l'ampoule (tip)
 * et le lien d'aide qui ouvre le guide.
 *
 * Ils sont ici, ensemble, parce qu'ils se ressemblent volontairement : le même
 * geste, partout, pour demander « pourquoi » ou « comment ».
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tipBoard } from '../content/tipBoards';
import { helpLinkFor } from '../content/guide';
import { Tip, tipForLayer } from '../content/tips';
import { GuideOrigin, LayerId, TabId, useNav } from '../navigation';
import { today } from '../songs/model';
import { useSettings } from '../state/settings';
import { Theme, useStyles, useTheme } from '../theme';
import { BulbIcon, InfoIcon } from './icons';
import { Fretboard } from './Fretboard';
import { Sheet, useTextStyles } from './ui';

/** Le bouton « i » : ouvre la feuille « Comprendre » de la couche. */
export function InfoButton({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={s.info}>
      <InfoIcon color={c.accent} size={24} />
    </Pressable>
  );
}

/** La feuille « Comprendre », à trois niveaux, puis « Pour retenir ». */
export function UnderstandSheet({
  layer,
  visible,
  onClose,
}: {
  layer: LayerId;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const text = t.understand.layers[layer];
  const levels: { title: string; body: string }[] = [
    { title: t.understand.short, body: text.short },
    { title: t.understand.onNeck, body: text.onNeck },
    { title: t.understand.byEar, body: text.byEar },
  ];
  return (
    <Sheet visible={visible} title={t.layers[layer]} onClose={onClose} closeLabel={t.close}>
      {levels.map((level) => (
        <View key={level.title} style={s.level}>
          <Text style={s.levelTitle}>{level.title}</Text>
          <Text style={s.levelBody}>{level.body}</Text>
        </View>
      ))}
      <View style={s.remember}>
        <View style={s.rememberHead}>
          <BulbIconSmall />
          <Text style={s.levelTitle}>{t.understand.remember}</Text>
        </View>
        <Text style={s.levelBody}>{text.remember}</Text>
      </View>
    </Sheet>
  );
}

function BulbIconSmall() {
  const { c } = useTheme();
  return <BulbIcon color={c.accent} size={18} />;
}

/** Le bandeau tip d'une couche : une ligne avec l'ampoule, qui ouvre le tip en entier. */
export function TipStrip({ layer }: { layer: LayerId }) {
  const { settings } = useSettings();
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  const [open, setOpen] = useState<Tip | null>(null);
  const tip = tipForLayer(settings.lang, layer, today());
  if (!tip) return null;
  return (
    <>
      <Pressable
        onPress={() => setOpen(tip)}
        accessibilityRole="button"
        accessibilityLabel={`${tip.title}. ${tip.memo}`}
        style={s.strip}
      >
        <BulbIcon color={c.accent} size={22} />
        <View style={s.stripText}>
          <Text style={s.stripTitle} numberOfLines={1}>
            {tip.title}
          </Text>
          <Text style={s.stripMemo} numberOfLines={2}>
            {tip.memo}
          </Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>
      <TipSheet tip={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** Un tip en entier : le texte, un schéma sur le manche quand il y en a un, l'exemple, le mémo. */
export function TipSheet({ tip, onClose }: { tip: Tip | null; onClose: () => void }) {
  const { t, notation } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const markers = tip ? tipBoard(tip.id, notation) : [];
  return (
    <Sheet visible={tip !== null} title={t.tips.bulb} onClose={onClose} closeLabel={t.close}>
      {tip ? (
        <View>
          <Text style={s.tipTitle}>{tip.title}</Text>
          <Text style={s.levelBody}>{tip.text}</Text>
          {markers.length ? (
            <View style={s.board}>
              <Fretboard markers={markers} focusFret={Math.max(0, Math.min(...markers.map((m) => m.fret)) - 1)} />
            </View>
          ) : null}
          <View style={s.level}>
            <Text style={s.levelTitle}>{t.tips.example}</Text>
            <Text style={s.levelBody}>{tip.example}</Text>
          </View>
          <View style={s.remember}>
            <View style={s.rememberHead}>
              <BulbIconSmall />
              <Text style={s.levelTitle}>{t.tips.memo}</Text>
            </View>
            <Text style={s.levelBody}>{tip.memo}</Text>
          </View>
          <Text style={ui.hint}>{t.tips.title}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

/**
 * Le lien « Comment ça marche » : tout petit, et un vrai lien profond vers une
 * section du guide. Le guide sait d'où l'on vient et propose « Retour à … ».
 */
export function HelpLink({
  screen,
  tab,
  originLabel,
  layer,
}: {
  /** La clé de `helpLinks` dans `content/guide.<langue>.json` : `manche.triades`. */
  screen: string;
  tab: TabId;
  originLabel: string;
  layer?: LayerId;
}) {
  const { settings } = useSettings();
  const nav = useNav();
  const s = useStyles(makeStyles);
  const link = helpLinkFor(settings.lang, screen);
  if (!link) return null;
  const origin: GuideOrigin = { tab, label: originLabel, layer };
  return (
    <Pressable
      onPress={() => nav.openGuide(link.target, origin)}
      accessibilityRole="link"
      accessibilityLabel={link.label}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={s.help}
    >
      <View style={s.helpMark}>
        <Text style={s.helpMarkText}>?</Text>
      </View>
      <Text style={s.helpText}>{link.label}</Text>
    </Pressable>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    info: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
    level: { paddingHorizontal: space.lg, marginTop: space.lg },
    levelTitle: { ...type.headline, color: c.label },
    levelBody: { ...type.body, color: c.label, marginTop: space.xs, paddingHorizontal: space.lg },
    remember: {
      marginHorizontal: space.lg,
      marginTop: space.xl,
      padding: space.lg,
      borderRadius: radius.card,
      backgroundColor: c.fill,
    },
    rememberHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      marginHorizontal: space.lg,
      marginTop: space.lg,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      minHeight: size.touch,
      borderRadius: radius.card,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
    },
    stripText: { flex: 1 },
    stripTitle: { ...type.subhead, color: c.label, fontWeight: '600' },
    stripMemo: { ...type.caption, color: c.secondary },
    chevron: { ...type.section, color: c.secondary },
    tipTitle: { ...type.cardTitle, color: c.label, paddingHorizontal: space.lg, marginTop: space.lg },
    board: { marginTop: space.lg },
    help: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: space.xs,
      marginTop: space.lg,
      minHeight: size.touch,
    },
    helpMark: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    helpMarkText: { fontSize: 10, lineHeight: 12, color: c.secondary, fontWeight: '600' },
    helpText: { fontSize: 13, color: c.secondary, textDecorationLine: 'underline' },
  });
