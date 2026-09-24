import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../state/settings';
import { radius, size, Theme, useStyles } from '../../theme';

/**
 * Une feuille modale, en plein écran.
 *
 * Elle porte sa propre barre : une poignée, le titre au centre, et une action à
 * gauche — « Annuler » ou « OK » selon l'appelant. Le titre reste centré quoi
 * qu'il arrive, donc l'action ne le pousse pas : les deux côtés ont la même
 * largeur minimale.
 */
export function Sheet({
  visible,
  title,
  onClose,
  closeLabel,
  children,
  footer,
  contentStyle,
  scroll = true,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Le libellé de gauche. « Annuler » par défaut. */
  closeLabel?: string;
  children: React.ReactNode;
  /** Une action collée en bas, au-dessus de la zone de sécurité. */
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
}) {
  const s = useStyles(makeStyles);
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const body = <View style={[s.content, contentStyle]}>{children}</View>;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingBottom: insets.bottom }]}>
        <View style={s.grabber} />
        <View style={s.bar}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={[s.barSide, s.barLeft]}
            hitSlop={12}
          >
            <Text style={s.barAction} numberOfLines={1}>
              {closeLabel ?? t.cancel}
            </Text>
          </Pressable>
          <Text style={s.barTitle} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <View style={s.barSide} />
        </View>

        {scroll ? (
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}

        {footer ? <View style={s.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.separator,
      marginTop: space.sm,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: size.row,
      paddingHorizontal: space.lg,
    },
    barSide: { width: 88 },
    barLeft: { alignItems: 'flex-start' },
    barAction: { ...type.body, color: c.accent },
    barTitle: { ...type.headline, color: c.label, flex: 1, textAlign: 'center' },
    scrollContent: { paddingBottom: space.xl },
    content: { flexGrow: 1 },
    footer: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      backgroundColor: c.background,
    },
  });
