/**
 * La bibliothèque de composants. Tout écran se construit avec ça plutôt qu'avec
 * des styles écrits sur place, pour que la charte tienne en un seul endroit.
 */
import { StyleSheet } from 'react-native';
import { Theme, useStyles } from '../../theme';

export { Card, LargeTitle, ListRow, Screen, SectionHeader } from './layout';
export {
  Chip,
  ChipRow,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  Stepper,
  Toggle,
} from './controls';
export { Sheet } from './Sheet';
export { ProgressRing } from './ProgressRing';
export { DisplayPicker, KeyPicker } from './pickers';
export type { Theme };

/**
 * Les styles de texte partagés : le corps, une note explicative, un intertitre.
 *
 * C'est un hook et non un objet, parce que la palette change avec l'apparence.
 */
export function useTextStyles() {
  return useStyles(({ c, type, space }: Theme) =>
    StyleSheet.create({
      body: { ...type.body, color: c.label, paddingHorizontal: space.lg },
      hint: { ...type.caption, color: c.secondary, paddingHorizontal: space.lg, lineHeight: 18 },
      sectionTitle: { ...type.section, color: c.label, paddingHorizontal: space.lg },
    }),
  );
}
