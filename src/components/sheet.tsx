import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterSheet } from '@/theme/motion';
import { colors } from '@/theme/tokens';

// Bottom sheet that springs up over a dimmed backdrop; tapping outside closes it.
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Fechar" />
      {visible ? (
        <Animated.View entering={enterSheet()} style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 22 + insets.bottom }}>
            {children}
          </ScrollView>
        </Animated.View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: colors.surface2,
    borderTopWidth: 1,
    borderColor: colors.line,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 },
});
