import React from 'react';
import { Screen, SectionHeader } from '../components/ui';
import { useSettings } from '../state/settings';
import { ProgressionPanel } from './ProgressionPanel';

/**
 * L'accueil, ouvert au lancement.
 *
 * Pour l'instant il tient la promesse minimale de son onglet : ce que la
 * pratique a construit. Le lot lui donne ensuite sa vraie forme — la salutation,
 * la semaine, et l'ordre des cartes qui suit le jour.
 */
export function TodayScreen() {
  const { t } = useSettings();
  return (
    <Screen tab="today" title={t.tabs.today}>
      <SectionHeader>{t.progression.title}</SectionHeader>
      <ProgressionPanel />
    </Screen>
  );
}
