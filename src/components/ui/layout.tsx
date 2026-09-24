import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { registerScroller, TabId, unregisterScroller } from '../../navigation';
import { SCREEN_BOTTOM, size, Theme, useStyles } from '../../theme';

/**
 * Le cadre d'un onglet : le fond, le défilement, le titre, et la place réservée
 * à la barre flottante.
 *
 * Le contenu défile sous la barre et reste visible à travers le verre : c'est
 * pour ça que la marge est une réserve en bas du contenu, pas un padding qui
 * rognerait le défilement.
 *
 * `tab` n'est passé que par les écrans qui sont la racine d'un onglet : c'est ce
 * qui permet à la barre de remonter la page quand on touche l'onglet déjà actif.
 */
export function Screen({
  title,
  action,
  header,
  tab,
  scroll = true,
  children,
}: {
  title?: string;
  /** Une action texte, à droite du titre. */
  action?: { label: string; onPress: () => void };
  /** Sous le titre, avant le contenu — la semaine de l'accueil, par exemple. */
  header?: React.ReactNode;
  /** L'onglet dont cet écran est la racine, s'il l'est. */
  tab?: TabId;
  scroll?: boolean;
  children: React.ReactNode;
}) {
  const s = useStyles(makeStyles);
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    if (!tab) return;
    registerScroller(tab, () => ref.current?.scrollTo({ y: 0, animated: true }));
    return () => unregisterScroller(tab);
  }, [tab]);

  const body = (
    <>
      {title ? <LargeTitle action={action}>{title}</LargeTitle> : null}
      {header}
      {children}
    </>
  );

  if (!scroll) return <View style={s.root}>{body}</View>;

  return (
    <ScrollView
      ref={ref}
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  );
}

export function LargeTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.titleRow}>
      <Text style={s.title} accessibilityRole="header">
        {children}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
          <Text style={s.titleAction}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionHeader({
  children,
  action,
  style,
}: {
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={[s.sectionRow, style]}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {children}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
          <Text style={s.sectionAction}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Une carte posée sur le fond. Aucune ombre : seuls les éléments flottants en portent. */
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const s = useStyles(makeStyles);
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [s.card, style, pressed && s.cardPressed]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Une ligne de liste. Le filet commence après l'icône, comme sur iOS : c'est ce
 * qui fait qu'une liste se lit comme une liste et pas comme un tableau.
 */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  chevron,
  onPress,
  right,
  destructive,
  muted,
  last,
  accessibilityLabel,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** La valeur, à droite du titre. */
  value?: string;
  chevron?: boolean;
  onPress?: () => void;
  /** Un contrôle à la place du chevron : un interrupteur, une pastille. */
  right?: React.ReactNode;
  destructive?: boolean;
  /** Une ligne annoncée mais pas encore utilisable : elle s'efface, sans badge. */
  muted?: boolean;
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const s = useStyles(makeStyles);
  const row = (
    <View style={[s.row, !last && s.rowSeparator]}>
      {icon !== undefined ? <View style={s.icon}>{icon}</View> : null}
      <View style={s.rowText}>
        <Text style={[s.rowTitle, muted && s.rowMuted, destructive && s.rowDestructive]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={s.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
      {right}
      {chevron ? <Text style={s.chevron}>›</Text> : null}
    </View>
  );

  if (!onPress) return row;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [pressed && s.rowPressed]}
    >
      {row}
    </Pressable>
  );
}

const makeStyles = ({ c, type, space, radius }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: SCREEN_BOTTOM },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.sm,
    },
    title: { ...type.greeting, color: c.label, flexShrink: 1 },
    titleAction: { ...type.body, color: c.accent },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      marginTop: space.xl,
      marginBottom: space.md,
    },
    sectionTitle: { ...type.section, color: c.label, flexShrink: 1 },
    sectionAction: { ...type.subhead, color: c.accent },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.card,
      padding: space.lg,
      marginHorizontal: space.lg,
    },
    cardPressed: { opacity: 0.7 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: size.row,
      paddingVertical: space.sm,
      marginHorizontal: space.lg,
    },
    rowSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
    rowPressed: { opacity: 0.6 },
    icon: {
      width: size.icon,
      height: size.icon,
      borderRadius: radius.icon,
      backgroundColor: c.iconBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: space.md,
    },
    rowText: { flex: 1 },
    rowTitle: { ...type.body, color: c.label },
    rowMuted: { color: c.secondary },
    rowDestructive: { color: c.destructive },
    rowSubtitle: { ...type.caption, color: c.secondary, marginTop: 2 },
    rowValue: { ...type.body, color: c.secondary, marginLeft: space.sm },
    chevron: { ...type.section, color: c.secondary, marginLeft: space.sm },
  });
