import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect } from 'react';
import { DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { IconName, SUBJECT_ICON, onColor, shade } from '@/components/subject-style';
import { PressableScale } from '@/components/ui';
import { RoadTopic, Subject, isMinor } from '@/data/catalog';
import { EASE_OUT, PRESS_OUT_MS, enterFade } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

export type NodeState = 'done' | 'doing' | 'todo';

// How far the face of a chunky button sits above its base, and sinks on press.
const DEPTH = 6;
const RING_PAD = 11;

// Duolingo-style chunky button: a darker base sits under the face, and the face sinks into it on press.
export function Chunky({
  width,
  height,
  radius,
  face,
  base,
  border,
  dashed,
  onPress,
  label,
  children,
}: {
  width: DimensionValue;
  height: number;
  radius: number;
  face: string;
  base: string;
  border?: string;
  dashed?: boolean;
  onPress?: () => void;
  label?: string;
  children: ReactNode;
}) {
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * DEPTH }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 80, easing: EASE_OUT });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: PRESS_OUT_MS, easing: EASE_OUT });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width, height: height + DEPTH }}>
      <View style={[StyleSheet.absoluteFill, { top: DEPTH, borderRadius: radius, backgroundColor: base }]} />
      <Animated.View
        style={[
          styles.face,
          {
            height,
            borderRadius: radius,
            backgroundColor: face,
            borderWidth: border ? 2 : 0,
            borderColor: border,
            borderStyle: dashed ? 'dashed' : 'solid',
          },
          faceStyle,
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function nodeLook(state: NodeState, subject: Subject, topic: RoadTopic, isCurrent: boolean) {
  const icon: IconName = topic.final ? 'trophy' : isMinor(topic) ? 'star' : SUBJECT_ICON[subject.id];
  const color = topic.final ? colors.gold : subject.color;
  if (state === 'done') {
    return { face: color, base: shade(color), icon: (topic.final ? 'trophy' : 'checkmark') as IconName, tint: onColor(color) };
  }
  if (isCurrent || state === 'doing') {
    return { face: color, base: shade(color), icon, tint: onColor(color) };
  }
  // Not started yet, but open: outlined in the subject color, never greyed out.
  return { face: colors.surface2, base: shade(color, 0.3), icon, tint: color, border: color, dashed: isMinor(topic) || !!topic.final };
}

const STATE_LABEL: Record<NodeState, string> = {
  done: 'concluído',
  doing: 'em andamento',
  todo: 'não iniciado',
};

export function PathNode({
  topic,
  subject,
  state,
  done,
  isCurrent,
  isFocus,
  index,
  offset,
  onPress,
}: {
  topic: RoadTopic;
  subject: Subject;
  state: NodeState;
  done: number;
  isCurrent: boolean;
  isFocus: boolean;
  index: number;
  offset: number;
  onPress: () => void;
}) {
  const size = isMinor(topic) ? 56 : 72;
  const ring = size + RING_PAD * 2;
  const look = nodeLook(state, subject, topic, isCurrent);
  const showRing = isCurrent || state === 'doing';

  return (
    <Animated.View
      // Only the first screenful staggers in; the rest are already in place when scrolled to.
      entering={enterFade(Math.min(index, 6) * 35)}
      style={[styles.nodeWrap, { left: offset, paddingTop: isCurrent ? 44 : 0 }]}>
      <View style={{ width: ring, height: ring }}>
        {isCurrent ? (
          <>
            <StartBubble label={isFocus ? 'SEU FOCO' : done > 0 ? 'CONTINUAR' : 'PRÓXIMO'} color={look.face} tint={look.tint} />
            <Pulse size={size} color={look.face} />
          </>
        ) : null}
        {showRing ? <ProgressRing size={ring} color={look.face} value={done / topic.lessons} /> : null}
        <View style={{ position: 'absolute', top: RING_PAD, left: RING_PAD }}>
          <Chunky
            width={size}
            height={size}
            radius={size / 2}
            face={look.face}
            base={look.base}
            border={look.border}
            dashed={look.dashed}
            onPress={onPress}
            label={`${topic.title}, ${STATE_LABEL[state]}`}>
            <Ionicons name={look.icon} size={size * 0.44} color={look.tint} />
          </Chunky>
        </View>
      </View>
      <Text style={styles.nodeLabel} numberOfLines={2}>
        {topic.title}
      </Text>
      {state !== 'todo' && !topic.final ? (
        <Text style={styles.nodeMeta}>
          {done}/{topic.lessons} aulas
        </Text>
      ) : null}
    </Animated.View>
  );
}

// Soft ripple behind the current node so the eye lands on it first.
function Pulse({ size, color }: { size: number; color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1);
  }, [reduce, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.22 * (1 - t.value),
    transform: [{ scale: 1 + 0.28 * t.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: RING_PAD, left: RING_PAD, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

function ProgressRing({ size, color, value }: { size: number; color: string; value: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
      {v > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </Svg>
  );
}

// Bobbing speech bubble over the current node, like Duolingo's "START".
function StartBubble({ label, color, tint }: { label: string; color: string; tint: string }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reduce, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.bubbleWrap, style]}>
      <View style={[styles.bubble, { backgroundColor: color }]}>
        <Text style={[styles.bubbleText, { color: tint }]}>{label}</Text>
      </View>
      <View style={[styles.bubbleTip, { borderTopColor: color }]} />
    </Animated.View>
  );
}

export function SubjectChip({
  subject,
  selected,
  weak,
  onPress,
}: {
  subject: Subject;
  selected: boolean;
  weak: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={weak ? `${subject.name}, matéria-gargalo` : subject.name}
      style={[styles.chip, selected && { borderColor: subject.color, backgroundColor: colors.surface2 }]}>
      <View style={[styles.chipIcon, { backgroundColor: selected ? subject.color : colors.surface2 }]}>
        <Ionicons
          name={SUBJECT_ICON[subject.id]}
          size={15}
          color={selected ? onColor(subject.color) : subject.color}
        />
      </View>
      <Text style={[styles.chipText, selected && { color: colors.text }]}>{subject.name}</Text>
      {weak ? <Ionicons name="flame" size={13} color={colors.gold} /> : null}
    </PressableScale>
  );
}

// Divider that opens each group of topics along the path.
export function GroupHeader({ title, done, total, color }: { title: string; done: number; total: number; color: string }) {
  return (
    <View style={styles.group} accessibilityRole="header">
      <View style={styles.groupLine} />
      <View style={styles.groupPill}>
        <Text style={[styles.groupTitle, { color }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.groupMeta}>
          {done}/{total}
        </Text>
      </View>
      <View style={styles.groupLine} />
    </View>
  );
}

export function UnitBanner({
  subject,
  done,
  total,
  currentTitle,
  examName,
}: {
  subject: Subject;
  done: number;
  total: number;
  currentTitle: string;
  examName: string;
}) {
  const tint = onColor(subject.color);
  const pct = total ? Math.min(1, done / total) : 0;
  return (
    <Animated.View
      entering={enterFade()}
      style={[styles.banner, { backgroundColor: subject.color, borderBottomColor: shade(subject.color) }]}>
      <View style={styles.bannerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.bannerKicker, { color: tint }]}>ROADMAP · {examName.toUpperCase()}</Text>
          <Text style={[styles.bannerTitle, { color: tint }]}>{subject.name}</Text>
          <Text style={[styles.bannerSub, { color: tint }]} numberOfLines={1}>
            Agora: {currentTitle}
          </Text>
        </View>
        <View style={[styles.bannerIcon, { backgroundColor: shade(subject.color, 0.8) }]}>
          <Ionicons name={SUBJECT_ICON[subject.id]} size={30} color={tint} />
        </View>
      </View>
      <View style={styles.bannerTrack}>
        <View style={[styles.bannerFill, { width: `${pct * 100}%`, backgroundColor: tint }]} />
      </View>
      <Text style={[styles.bannerMeta, { color: tint }]}>
        {done} de {total} assuntos do seu edital concluídos
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  nodeWrap: { width: 170, alignItems: 'center' },
  nodeMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginTop: 1 },
  nodeLabel: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
  bubbleWrap: { position: 'absolute', bottom: '100%', left: -60, right: -60, alignItems: 'center', marginBottom: 2 },
  bubble: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 12 },
  bubbleText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
  bubbleTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.line,
  },
  chipIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13 },
  group: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', marginTop: 8 },
  groupLine: { flex: 1, height: 1, backgroundColor: colors.line },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '75%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  groupTitle: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.4 },
  groupMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  banner: { borderRadius: 18, padding: 16, borderBottomWidth: 5, marginBottom: 8 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerKicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, opacity: 0.75 },
  bannerTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  bannerSub: { fontFamily: fonts.medium, fontSize: 13, opacity: 0.85, marginTop: 2 },
  bannerIcon: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bannerTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.22)', marginTop: 14, overflow: 'hidden' },
  bannerFill: { height: 8, borderRadius: 4 },
  bannerMeta: { fontFamily: fonts.medium, fontSize: 11, marginTop: 6, opacity: 0.85 },
});
