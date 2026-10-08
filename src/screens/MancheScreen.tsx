import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { HelpLink, InfoButton, TipStrip, UnderstandSheet } from '../components/guideBits';
import { Chip, Screen } from '../components/ui';
import { LAYERS, LayerId } from '../navigation';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { CagedScreen } from './CagedScreen';
import { ChordsPanel } from './ChordsPanel';
import { IntervalsPanel, NeckNotesPanel } from './NeckPanels';
import { ScalesScreen } from './ScalesScreen';
import { TriadsPanel } from './TriadsPanel';

/**
 * L'onglet Manche : le même manche, lu en six couches.
 *
 * Les couches suivent l'ordre où on les apprend — les notes, les intervalles, les
 * accords, les gammes, CAGED, les triades. Les pastilles défilent pour que la
 * couche active reste toujours visible, y compris quand on arrive d'un raccourci
 * de l'Accueil sur la dernière.
 */
export function MancheScreen({ layer, onLayer }: { layer: LayerId; onLayer: (layer: LayerId) => void }) {
  const { t } = useSettings();
  const [understanding, setUnderstanding] = useState(false);

  return (
    <Screen
      tab="neck"
      title={t.tabs.neck}
      titleRight={<InfoButton label={t.understand.open(t.layers[layer])} onPress={() => setUnderstanding(true)} />}
      header={<LayerPills layer={layer} onLayer={onLayer} />}
    >
      {layer === 'notes' && <NeckNotesPanel />}
      {layer === 'intervals' && <IntervalsPanel />}
      {layer === 'chords' && <ChordsPanel />}
      {layer === 'scales' && <ScalesScreen />}
      {layer === 'caged' && <CagedScreen />}
      {layer === 'triads' && <TriadsPanel />}

      <TipStrip layer={layer} />
      <HelpLink
        screen={layer === 'triads' ? 'manche.triades' : 'manche'}
        tab="neck"
        originLabel={`${t.tabs.neck} · ${t.layers[layer]}`}
        layer={layer}
      />
      <UnderstandSheet layer={layer} visible={understanding} onClose={() => setUnderstanding(false)} />
    </Screen>
  );
}

/** Les pastilles des couches, qui défilent pour garder la couche active à l'écran. */
function LayerPills({ layer, onLayer }: { layer: LayerId; onLayer: (layer: LayerId) => void }) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<LayerId, number>>>({});
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const x = offsets.current[layer];
    if (x === undefined || !width) return;
    scroller.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [layer, width]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={t.layersLabel}
      contentContainerStyle={s.pills}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {LAYERS.map((id) => (
        <View
          key={id}
          onLayout={(e) => {
            offsets.current[id] = e.nativeEvent.layout.x;
          }}
        >
          <Chip label={t.layers[id]} selected={id === layer} onPress={() => onLayer(id)} />
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    pills: { paddingHorizontal: space.lg, gap: space.sm, paddingVertical: space.xs },
  });
