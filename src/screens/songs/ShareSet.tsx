import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PrimaryButton, SectionHeader, Sheet, useTextStyles } from '../../components/ui';
import { WorshipSet } from '../../songs/model';
import { readSharedLink, shareLink, shareSet } from '../../songs/share';
import { useSongs } from '../../songs/store';
import { useSettings } from '../../state/settings';
import { Theme, useStyles, useTheme } from '../../theme';

/**
 * Partager un set : un lien, et un QR code pour le même lien.
 *
 * Le lien contient la date, le nom du culte, les titres, les tonalités, les capos
 * et les grilles en chiffrage Nashville. Jamais les paroles : elles ne quittent pas
 * l'appareil, et un lien se colle n'importe où.
 *
 * Le QR code existe parce que le lien est déjà en base64url, donc sans espace ni
 * caractère à échanger entre un téléphone et un autre ; il évite d'avoir à faire
 * passer un texte par une messagerie au moment où l'équipe se prépare.
 */
export function ShareSet({
  set,
  visible,
  onClose,
}: {
  set: WorshipSet | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, settings } = useSettings();
  const { songs } = useSongs();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [copied, setCopied] = useState(false);

  if (!set) return null;

  const link = shareLink(shareSet(set, songs, settings.firstName));
  // A link the app cannot read back is a bug, not a share: better to say so here
  // than to have the other phone show "that link holds no readable set".
  const readable = readSharedLink(link) !== null;

  const copy = () => {
    Clipboard.setStringAsync(link)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  return (
    <Sheet visible={visible} title={t.worship.share} onClose={onClose} closeLabel={t.close}>
      <Text style={ui.hint}>{t.worship.shareHint}</Text>

      {readable ? (
        <View style={s.qr}>
          <QRCode value={link} size={196} backgroundColor={c.card} color={c.label} />
          <Text style={s.qrHint}>{t.worship.qrHint}</Text>
        </View>
      ) : (
        <Text style={ui.hint}>{t.worship.badLink}</Text>
      )}

      <SectionHeader>{t.worship.copyLink}</SectionHeader>
      {/* Le lien est écrit en clair autant que lisible : c'est une adresse qu'on
          doit pouvoir recopier à la main quand le presse-papiers ne suffit pas. */}
      <Text style={ui.hint} numberOfLines={3}>
        {link}
      </Text>
      <View style={s.action}>
        <PrimaryButton label={copied ? t.worship.copied : t.worship.copyLink} onPress={copy} />
      </View>
      <Text style={ui.hint}>{t.worship.lyricsNote}</Text>
    </Sheet>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    qr: { alignItems: 'center', marginTop: space.lg },
    qrHint: { ...type.caption, color: c.secondary, marginTop: space.sm },
    action: { paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.md },
  });
