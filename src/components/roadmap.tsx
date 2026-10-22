import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect } from 'react';
import { DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SUBJECT_ICON, onColor } from '@/components/subject-style';
import { PressableScale } from '@/components/ui';
import { RoadTopic, Subject, isMinor } from '@/data/catalog';
import { EASE_OUT, PRESS_OUT_MS, enterFade } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

export type NodeState = 'done' | 'doing' | 'todo';

// How far the face of a chunky button sits above its base, and sinks on press.
const DEPTH = 6;

// Chunky button: a darker base sits under the face, and the face sinks into it on press.
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
        press.set(withTiming(1, { duration: 80, easing: EASE_OUT }));
      }}
      onPressOut={() => {
        press.set(withTiming(0, { duration: PRESS_OUT_MS, easing: EASE_OUT }));
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

const STATE_LABEL: Record<NodeState, string> = {
  done: 'concluído',
  doing: 'em andamento',
  todo: 'não iniciado',
};

// Subway-map layout: a vertical line in the subject color, each topic a station beside it.
const RAIL_W = 40;
const LINE_W = 4;
// Vertical center of the station dot inside a row, so line segments meet it exactly.
const DOT_Y = 30;
const DOT_SLOT = 28;

function StationDot({ topic, subject, state, isCurrent }: { topic: RoadTopic; subject: Subject; state: NodeState; isCurrent: boolean }) {
  const color = topic.final ? colors.gold : subject.color;
  if (topic.final) {
    // Terminal station: a square stop instead of a round one.
    return (
      <View style={[styles.terminal, { backgroundColor: state === 'done' ? color : colors.ink, borderColor: color }]}>
        <Ionicons name="trophy" size={13} color={state === 'done' ? onColor(color) : color} />
      </View>
    );
  }
  if (isCurrent) {
    return (
      <>
        <Pulse size={DOT_SLOT} color={color} />
        <View style={[styles.dot, { width: DOT_SLOT, height: DOT_SLOT, backgroundColor: color, borderWidth: 0 }]}>
          <Ionicons name={SUBJECT_ICON[subject.id]} size={15} color={onColor(color)} />
        </View>
      </>
    );
  }
  const size = isMinor(topic) ? 14 : 20;
  if (state === 'done') {
    return (
      <View style={[styles.dot, { width: size, height: size, backgroundColor: color, borderWidth: 0 }]}>
        <Ionicons name="checkmark" size={size * 0.7} color={onColor(color)} />
      </View>
    );
  }
  // Open stations are outlined in the subject color, never greyed out; started ones get a filled core.
  return (
    <View style={[styles.dot, { width: size, height: size, borderColor: color }]}>
      {state === 'doing' ? <View style={[styles.core, { width: size / 2.4, height: size / 2.4, backgroundColor: color }]} /> : null}
    </View>
  );
}

export function Station({
  topic,
  subject,
  state,
  done,
  isCurrent,
  isFocus,
  index,
  topLit,
  bottomLit,
  first,
  last,
  onPress,
}: {
  topic: RoadTopic;
  subject: Subject;
  state: NodeState;
  done: number;
  isCurrent: boolean;
  isFocus: boolean;
  index: number;
  // Whether the line segments above and below this station are lit in the subject color.
  topLit: boolean;
  bottomLit: boolean;
  first: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const color = topic.final ? colors.gold : subject.color;
  const pct = topic.lessons ? Math.min(1, done / topic.lessons) : 0;
  const kicker = isFocus ? 'SEU FOCO' : done > 0 ? 'CONTINUE DAQUI' : 'PRÓXIMA PARADA';

  return (
    <Animated.View
      // Only the first screenful staggers in; the rest are already in place when scrolled to.
      entering={enterFade(Math.min(index, 8) * 30)}
      style={styles.row}>
      <View style={styles.rail}>
        {first ? null : <View style={[styles.seg, { top: 0, height: DOT_Y, backgroundColor: topLit ? subject.color : colors.line }]} />}
        {last ? null : <View style={[styles.seg, { top: DOT_Y, bottom: 0, backgroundColor: bottomLit ? subject.color : colors.line }]} />}
        <View style={styles.dotSlot}>
          <StationDot topic={topic} subject={subject} state={state} isCurrent={isCurrent} />
        </View>
      </View>
      <PressableScale
        onPress={onPress}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={`${topic.title}, ${STATE_LABEL[state]}`}
        style={[
          styles.card,
          isCurrent && { borderColor: color, backgroundColor: colors.surface2, paddingVertical: 14 },
          topic.final && !isCurrent && { borderColor: colors.goldDim, borderStyle: 'dashed' },
        ]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {isCurrent ? <Text style={[styles.kicker, { color }]}>{kicker}</Text> : null}
          <Text
            style={[styles.title, isCurrent && styles.titleCurrent, state === 'done' && !isCurrent && { color: colors.muted }]}
            numberOfLines={2}>
            {topic.title}
          </Text>
          <View style={styles.metaRow}>
            {topic.final ? (
              <Text style={styles.meta}>Fim da linha · simulado da área</Text>
            ) : state === 'done' ? (
              <Text style={styles.meta}>Concluído</Text>
            ) : state === 'doing' || isCurrent ? (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.meta}>
                  {done}/{topic.lessons} aulas
                </Text>
              </>
            ) : (
              <Text style={styles.meta}>{topic.lessons} aulas</Text>
            )}
            {isMinor(topic) ? <Text style={styles.tag}>peso menor</Text> : null}
            {isFocus && !isCurrent ? <Ionicons name="flag" size={12} color={color} /> : null}
          </View>
        </View>
        {isCurrent ? (
          <View style={[styles.go, { backgroundColor: color }]}>
            <Ionicons name="arrow-forward" size={18} color={onColor(color)} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        )}
      </PressableScale>
    </Animated.View>
  );
}

// Soft ripple behind the current station so the eye lands on it first.
function Pulse({ size, color }: { size: number; color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1));
  }, [reduce, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 * (1 - t.value),
    transform: [{ scale: 1 + 0.6 * t.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
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

// Interchange that opens each group of topics along the line.
export function GroupHeader({
  title,
  done,
  total,
  color,
  lit,
  first,
}: {
  title: string;
  done: number;
  total: number;
  color: string;
  lit: boolean;
  first: boolean;
}) {
  return (
    <View style={styles.group} accessibilityRole="header">
      <View style={styles.rail}>
        {first ? null : <View style={[styles.seg, { top: 0, bottom: 0, backgroundColor: lit ? color : colors.line }]} />}
        <View style={[styles.interchange, { borderColor: color }]} />
      </View>
      <Text style={[styles.groupTitle, { color }]} numberOfLines={1}>
        {title.toUpperCase()}
      </Text>
      <Text style={styles.groupMeta}>
        {done}/{total}
      </Text>
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
    <Animated.View entering={enterFade()} style={[styles.banner, { backgroundColor: subject.color }]}>
      <View style={styles.bannerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.bannerKicker, { color: tint }]}>ROADMAP · {examName.toUpperCase()}</Text>
          <Text style={[styles.bannerTitle, { color: tint }]}>{subject.name}</Text>
          <Text style={[styles.bannerSub, { color: tint }]} numberOfLines={1}>
            Agora: {currentTitle}
          </Text>
        </View>
        <View style={[styles.bannerIcon, { backgroundColor: 'rgba(0,0,0,0.16)' }]}>
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
  row: { flexDirection: 'row', alignSelf: 'stretch', minHeight: DOT_Y * 2 },
  rail: { width: RAIL_W, alignItems: 'center' },
  seg: { position: 'absolute', width: LINE_W, left: (RAIL_W - LINE_W) / 2 },
  dotSlot: {
    position: 'absolute',
    top: DOT_Y - DOT_SLOT / 2,
    width: RAIL_W,
    height: DOT_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 3, backgroundColor: colors.ink },
  core: { borderRadius: 999 },
  terminal: { width: 26, height: 26, borderRadius: 7, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 5,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, marginBottom: 3 },
  title: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  titleCurrent: { fontFamily: fonts.title, fontSize: 18, lineHeight: 23 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  meta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  tag: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  track: { width: 56, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  go: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
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
  group: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 8, height: 44 },
  interchange: { width: 24, height: 18, borderRadius: 9, borderWidth: 3, backgroundColor: colors.ink, marginTop: 13 },
  groupTitle: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  groupMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  banner: { borderRadius: 18, padding: 16, marginBottom: 8 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerKicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, opacity: 0.75 },
  bannerTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  bannerSub: { fontFamily: fonts.medium, fontSize: 13, opacity: 0.85, marginTop: 2 },
  bannerIcon: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bannerTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.22)', marginTop: 14, overflow: 'hidden' },
  bannerFill: { height: 8, borderRadius: 4 },
  bannerMeta: { fontFamily: fonts.medium, fontSize: 11, marginTop: 6, opacity: 0.85 },
});
