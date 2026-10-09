import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '@/theme/tokens';

// The seal badge. `animated` makes it bob and breathe, used on the loading screen.
export function LogoBadge({ size = 88, animated = false }: { size?: number; animated?: boolean }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!animated || reduce) return;
    t.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [animated, reduce, t]);

  const badge = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * t.value }, { rotate: `${-4 * t.value}deg` }],
  }));
  const glow = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.35 * t.value,
    transform: [{ scale: 1 + 0.18 * t.value }],
  }));

  const r = size * 0.32;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: r, backgroundColor: colors.accent }, styles.glow, glow]}
      />
      <Animated.View style={[styles.badge, { width: size, height: size, borderRadius: r }, badge]}>
        <Text style={{ fontSize: size * 0.5 }}>🦭</Text>
      </Animated.View>
    </View>
  );
}

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <Text style={[styles.brand, { fontSize: size }]}>
      Foca<Text style={{ color: colors.accent }}>AI</Text>
    </Text>
  );
}

// Three dots that hop in turn under the logo.
function Dots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    const hop = withSequence(
      withTiming(-8, { duration: 260, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 480 }),
    );
    const id = setTimeout(() => {
      y.set(withRepeat(hop, -1));
    }, delay);
    return () => clearTimeout(id);
  }, [delay, reduce, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function LoadingScreen() {
  return (
    <View style={styles.loading} accessibilityLabel="Carregando o FocaAI">
      <LogoBadge size={104} animated />
      <View style={{ height: 22 }} />
      <Wordmark size={34} />
      <Dots />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { shadowColor: colors.accent, shadowOpacity: 0.9, shadowRadius: 24 },
  // Rendered before custom fonts load, so it falls back to the system face gracefully.
  brand: { fontFamily: fonts.titleBold, color: colors.text },
  loading: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 26, height: 20, alignItems: 'flex-end' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
