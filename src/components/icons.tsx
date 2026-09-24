/**
 * Les icônes de la barre d'onglets, au trait.
 *
 * Elles sont dessinées ici plutôt que tirées d'une fonte : cinq signes, une
 * épaisseur unique, et rien à charger. Chacune est tracée dans un carré de 24 et
 * reçoit sa couleur de l'appelant, jamais du fichier.
 */
import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export interface IconProps {
  color: string;
  /** Le côté du carré, en points. 22 par défaut, comme la charte. */
  size?: number;
}

/** 1,8 d'épaisseur, bouts arrondis : le trait reste net à 22 comme à 44. */
const STROKE = 1.8;

function Frame({ color, size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Aujourd'hui : le soleil. */
export function SunIcon(props: IconProps) {
  const p = stroke(props.color);
  return (
    <Frame {...props}>
      <Circle cx={12} cy={12} r={4} {...p} />
      <Line x1={12} y1={2.5} x2={12} y2={5} {...p} />
      <Line x1={12} y1={19} x2={12} y2={21.5} {...p} />
      <Line x1={2.5} y1={12} x2={5} y2={12} {...p} />
      <Line x1={19} y1={12} x2={21.5} y2={12} {...p} />
      <Line x1={5.2} y1={5.2} x2={7} y2={7} {...p} />
      <Line x1={17} y1={17} x2={18.8} y2={18.8} {...p} />
      <Line x1={18.8} y1={5.2} x2={17} y2={7} {...p} />
      <Line x1={7} y1={17} x2={5.2} y2={18.8} {...p} />
    </Frame>
  );
}

/** Louange : la note de musique. */
export function NoteIcon(props: IconProps) {
  const p = stroke(props.color);
  return (
    <Frame {...props}>
      <Path d="M9 17.5V5.5l10-2v12" {...p} />
      <Circle cx={6.5} cy={17.5} r={2.5} {...p} />
      <Circle cx={16.5} cy={15.5} r={2.5} {...p} />
    </Frame>
  );
}

/** Accords : la grille d'accord. */
export function GridIcon(props: IconProps) {
  const p = stroke(props.color);
  return (
    <Frame {...props}>
      <Line x1={4} y1={3} x2={4} y2={21} {...p} />
      <Line x1={12} y1={3} x2={12} y2={21} {...p} />
      <Line x1={20} y1={3} x2={20} y2={21} {...p} />
      <Line x1={3} y1={3} x2={21} y2={3} {...p} />
      <Line x1={3} y1={9} x2={21} y2={9} {...p} />
      <Line x1={3} y1={15} x2={21} y2={15} {...p} />
      <Line x1={3} y1={21} x2={21} y2={21} {...p} />
    </Frame>
  );
}

/** Manche : le manche vu de face. */
export function NeckIcon(props: IconProps) {
  const p = stroke(props.color);
  return (
    <Frame {...props}>
      <Rect x={7} y={2.5} width={10} height={19} rx={2.5} {...p} />
      <Line x1={7} y1={8} x2={17} y2={8} {...p} />
      <Line x1={7} y1={13.5} x2={17} y2={13.5} {...p} />
      <Line x1={10.3} y1={2.5} x2={10.3} y2={21.5} {...p} />
      <Line x1={13.7} y1={2.5} x2={13.7} y2={21.5} {...p} />
    </Frame>
  );
}

/** Exercices : la cible. */
export function TargetIcon(props: IconProps) {
  const p = stroke(props.color);
  return (
    <Frame {...props}>
      <Circle cx={12} cy={12} r={9} {...p} />
      <Circle cx={12} cy={12} r={4} {...p} />
      <Circle cx={12} cy={12} r={1} fill={props.color} stroke="none" />
    </Frame>
  );
}

/**
 * La série : la flamme.
 *
 * Elle marque les jours d'affilée. Le nombre est écrit à côté, donc la flamme
 * n'est pas seule à porter l'information.
 */
export function FlameIcon(props: IconProps) {
  const p = stroke(props.color);
  return (
    <Frame {...props}>
      <Path d="M12 2.5c3.4 3.6 5.5 6.3 5.5 9.4a5.5 5.5 0 0 1-11 0c0-1.6.7-3 1.9-4.4.3 1 .9 1.8 1.7 2.2-.4-2.6-.2-4.6.9-6.2.3-.4.6-.7 1-1z" {...p} />
    </Frame>
  );
}

/** Mon espace : la silhouette. */
export function PersonIcon(props: IconProps) {
  const p = stroke(props.color);
  return (
    <Frame {...props}>
      <Circle cx={12} cy={8.5} r={3.8} {...p} />
      <Path d="M4.8 20.5c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6" {...p} />
    </Frame>
  );
}
