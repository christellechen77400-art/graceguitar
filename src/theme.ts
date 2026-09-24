import { Platform } from 'react-native';

/** Evening-service palette: indigo night, rosewood neck, gold-leaf roots. */
export const colors = {
  bg: '#17142B',
  surface: '#221E3A',
  surfaceHi: '#2E2950',
  border: '#3A3460',
  text: '#EDE8F5',
  muted: '#A59FC0',
  rosewood: '#4A2E24',
  rosewoodEdge: '#3A231B',
  fretWire: '#C9C3B8',
  bone: '#EFE6D2',
  string: '#D8D2C4',
  inlay: '#E9DFC9',
  gold: '#E8B54D',
  sky: '#8DB6E6',
  lilac: '#C996D8',
  ink: '#1B1530',
  cream: '#FFF3D6',
};

export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
