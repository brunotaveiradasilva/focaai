import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EASE_OUT, PRESS_IN_MS, PRESS_OUT_MS, softenScale } from '@/theme/motion';
import { colors, fonts, radius } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Subtle press feedback shared by every tappable surface.
export function PressableScale({
  children,
  style,
  scaleTo = 0.95,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.set(withTiming(softenScale(scaleTo), { duration: PRESS_IN_MS, easing: EASE_OUT }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: PRESS_OUT_MS, easing: EASE_OUT }));
        onPressOut?.(e);
      }}
      style={[style, anim]}>
      {children}
    </AnimatedPressable>
  );
}

export function Screen({
  children,
  scroll = true,
  footer,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.column}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

// A screen whose data is still coming from the API, or failed to.
export function Loading({ error, onRetry }: { error?: boolean; onRetry?: () => void }) {
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center', alignItems: 'center', gap: 14 }}>
      {error ? (
        <>
          <Text style={[styles.btnText, { color: colors.muted, textAlign: 'center' }]}>
            Não deu para carregar. Confira sua internet.
          </Text>
          {onRetry ? <Button label="Tentar de novo" onPress={onRetry} style={{ alignSelf: 'stretch' }} /> : null}
        </>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </Screen>
  );
}

export function Kicker({ children, style }: TextProps & { children: ReactNode }) {
  return <Text style={[styles.kicker, style]}>{children}</Text>;
}

export function Title({ children, style }: TextProps & { children: ReactNode }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Sub({ children, style }: TextProps & { children: ReactNode }) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function Body({ children, style, muted }: TextProps & { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      scaleTo={0.92}
      style={[styles.pill, selected && styles.pillSel]}>
      <Text style={[styles.pillText, selected && { color: colors.accent }]}>{label}</Text>
    </PressableScale>
  );
}

export function PillRow({ children }: { children: ReactNode }) {
  return <View style={styles.pillRow}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.97} style={[styles.card, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'gold';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v =
    variant === 'ghost' ? styles.btnGhost : variant === 'gold' ? styles.btnGold : styles.btnPrimary;
  const t =
    variant === 'ghost'
      ? { color: colors.muted }
      : variant === 'gold'
        ? { color: colors.goldText }
        : { color: colors.accentText };
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.btn, v, disabled && { opacity: 0.4 }, style]}>
      <Text style={[styles.btnText, t]}>{label}</Text>
    </PressableScale>
  );
}

export function Tag({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'accent' | 'gold' }) {
  const c = tone === 'accent' ? colors.accent : tone === 'gold' ? colors.gold : colors.muted;
  const b = tone === 'accent' ? colors.accentDim : tone === 'gold' ? colors.goldDim : colors.line;
  return (
    <View style={[styles.tag, { borderColor: b }]}>
      <Text style={[styles.tagText, { color: c }]}>{label}</Text>
    </View>
  );
}

export function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statN}>{value}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Dots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotOn]} />
      ))}
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <PressableScale
        accessibilityLabel={`Diminuir ${label}`}
        scaleTo={0.85}
        style={styles.stepBtn}
        onPress={() => onChange(Math.max(min, value - step))}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </PressableScale>
      <Text style={styles.stepVal}>
        {value}
        {suffix ? <Text style={styles.stepSuffix}>{suffix}</Text> : null}
      </Text>
      <PressableScale
        accessibilityLabel={`Aumentar ${label}`}
        scaleTo={0.85}
        style={styles.stepBtn}
        onPress={() => onChange(Math.min(max, value + step))}>
        <Ionicons name="add" size={18} color={colors.text} />
      </PressableScale>
    </View>
  );
}

export const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  stepLabel: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: { minWidth: 44, textAlign: 'center', color: colors.text, fontFamily: fonts.title, fontSize: 18 },
  stepSuffix: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  screen: { flex: 1, backgroundColor: colors.ink },
  column: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },
  footer: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 8, flexDirection: 'row', gap: 8 },
  kicker: { color: colors.accent, fontSize: 12, fontFamily: fonts.semibold, marginBottom: 4 },
  title: { color: colors.text, fontFamily: fonts.title, fontSize: 24, marginBottom: 4, letterSpacing: -0.2 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: 20, lineHeight: 19 },
  body: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  pill: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface2,
  },
  pillSel: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pillText: { color: colors.text, fontFamily: fonts.body, fontSize: 13 },
  card: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  btn: { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', flexGrow: 1 },
  btnPrimary: { backgroundColor: colors.accent },
  btnGold: { backgroundColor: colors.gold },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line, flexGrow: 0 },
  btnText: { fontFamily: fonts.semibold, fontSize: 14 },
  tag: { borderWidth: 1, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7, marginRight: 4, marginTop: 4 },
  tagText: { fontSize: 11, fontFamily: fonts.body },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
  },
  statN: { color: colors.text, fontFamily: fonts.title, fontSize: 20 },
  statL: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { width: 18, backgroundColor: colors.accent },
});
