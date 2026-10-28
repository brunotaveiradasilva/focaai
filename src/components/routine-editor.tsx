import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Card, Pill, PillRow, PressableScale } from '@/components/ui';
import { DAYS, DAY_NAMES, PERIODS } from '@/lib/calendar';
import { formatMin } from '@/lib/format';
import {
  ACTIVITY_KINDS,
  ActivityKind,
  COMMUTES,
  MIN_FREE,
  PRESETS,
  Routine,
  RoutineItem,
  fmtTime,
  kindLabel,
  newItemId,
} from '@/lib/routine';
import { enterSheet } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const WEEKDAYS = [0, 1, 2, 3, 4];

// Quick picks under each time of the day; any other time can be typed.
const WAKE_TIMES = [5 * 60 + 30, 6 * 60, 6 * 60 + 30, 7 * 60, 8 * 60];
const SLEEP_TIMES = [22 * 60, 22 * 60 + 30, 23 * 60, 23 * 60 + 30, 0];
const LUNCH_START_TIMES = [11 * 60 + 30, 12 * 60, 12 * 60 + 30, 13 * 60];
const LUNCH_END_TIMES = [12 * 60 + 30, 13 * 60, 13 * 60 + 30, 14 * 60];

type Props = {
  value: Routine;
  onChange: (r: Routine) => void;
  week?: boolean[];
  free?: number[][] | null;
};

// Fixed commitments of the week: wake/sleep/lunch, recurring activities per day, and the
// study time each day keeps in the periods the student marked as free (`week`). `free` is that
// time per day and period, worked out by the API from `value` (POST /api/plano/previa).
// The onboarding shows the two halves on separate steps.
export function RoutineEditor(props: Props) {
  return (
    <View>
      <DayTimes value={props.value} onChange={props.onChange} />
      <View style={styles.divider} />
      <WeekActivities {...props} />
    </View>
  );
}

/** Wake, sleep and lunch times. */
export function DayTimes({ value, onChange, suggestions }: Pick<Props, 'value' | 'onChange'> & { suggestions?: boolean }) {
  const set = (patch: Partial<Routine>) => onChange({ ...value, ...patch });
  return (
    <View style={styles.times}>
      <TimeField label="Acordo às" value={value.wake} onChange={(wake) => set({ wake })} suggestions={suggestions ? WAKE_TIMES : undefined} />
      <TimeField label="Durmo às" value={value.sleep} onChange={(sleep) => set({ sleep })} suggestions={suggestions ? SLEEP_TIMES : undefined} />
      <TimeField
        label="Almoço de"
        value={value.lunchStart}
        onChange={(lunchStart) => set({ lunchStart })}
        suggestions={suggestions ? LUNCH_START_TIMES : undefined}
      />
      <TimeField
        label="até"
        value={value.lunchEnd}
        onChange={(lunchEnd) => set({ lunchEnd })}
        suggestions={suggestions ? LUNCH_END_TIMES : undefined}
      />
    </View>
  );
}

/** Recurring activities per day: shortcuts, the chosen day's list and the form to add more. */
export function WeekActivities({ value, onChange, week, free }: Props) {
  const [day, setDay] = useState(0);
  const [kind, setKind] = useState<ActivityKind>('escola');
  const [name, setName] = useState('');
  const [days, setDays] = useState<number[]>([0]);
  const [start, setStart] = useState(18 * 60);
  const [end, setEnd] = useState(19 * 60 + 30);
  const [commute, setCommute] = useState(0);
  const [added, setAdded] = useState<{ title: string; detail: string } | null>(null);

  const set = (patch: Partial<Routine>) => onChange({ ...value, ...patch });
  const ofDay = value.items.filter((i) => i.day === day).sort((a, b) => a.start - b.start);
  const invalid = end <= start;

  // Presets replace the same kind of activity on weekdays, so tapping twice doesn't duplicate.
  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const kept = value.items.filter((i) => !(WEEKDAYS.includes(i.day) && i.kind === p.kind));
    const fresh = WEEKDAYS.map((d): RoutineItem => ({ id: newItemId(), kind: p.kind, day: d, start: p.start, end: p.end, commute: 0 }));
    set({ items: [...kept, ...fresh] });
    setAdded({ title: p.label, detail: `${dayList(WEEKDAYS)}, das ${fmtTime(p.start)} às ${fmtTime(p.end)}.` });
  };

  const add = () => {
    if (invalid || !days.length) return;
    const label = name.trim() || undefined;
    const fresh = days.map((d): RoutineItem => ({ id: newItemId(), kind, name: label, day: d, start, end, commute }));
    set({ items: [...value.items, ...fresh] });
    setName('');
    setAdded({
      title: label ? `${kindLabel(kind)} · ${label}` : kindLabel(kind),
      detail: `${dayList(days)}, das ${fmtTime(start)} às ${fmtTime(end)}${commute ? `, com ${commute} min de deslocamento` : ''}.`,
    });
  };

  const marked = week ? [0, 1, 2].filter((p) => week[p * 7 + day]) : [];
  const freeToday = marked.map((p) => free?.[day]?.[p] ?? 0).filter((m) => m >= MIN_FREE);

  return (
    <View>
      <Text style={styles.label}>Atalhos para segunda a sexta</Text>
      <PillRow>
        {PRESETS.map((p) => (
          <Pill key={p.id} label={p.label} onPress={() => applyPreset(p)} />
        ))}
      </PillRow>

      <Card style={styles.block}>
        <View style={styles.blockHead}>
          <Text style={styles.blockTitle}>Sua semana</Text>
          {value.items.length ? (
            <PressableScale scaleTo={0.92} onPress={() => set({ items: [] })} style={styles.clear} accessibilityRole="button">
              <Text style={styles.clearText}>Limpar tudo</Text>
            </PressableScale>
          ) : null}
        </View>
        <View style={styles.days}>
          {DAYS.map((d, i) => {
            const on = i === day;
            const count = value.items.filter((x) => x.day === i).length;
            return (
              <PressableScale
                key={d}
                scaleTo={0.9}
                onPress={() => {
                  setDay(i);
                  setDays([i]);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${DAY_NAMES[i]}, ${count} atividades`}
                style={[styles.day, on && styles.dayOn]}>
                <Text style={[styles.dayName, on && styles.dayTextOn]}>{d}</Text>
                <Text style={[styles.dayCount, on && styles.dayTextOn]}>{count}</Text>
              </PressableScale>
            );
          })}
        </View>

        {ofDay.length ? (
          <View style={{ gap: 8 }}>
            {ofDay.map((i) => (
              <View key={i.id} style={styles.item}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemTitle}>{i.name ? `${kindLabel(i.kind)} · ${i.name}` : kindLabel(i.kind)}</Text>
                  <Text style={styles.itemMeta}>
                    {fmtTime(i.start)} às {fmtTime(i.end)}
                    {i.commute ? ` · ${i.commute} min de deslocamento` : ''}
                  </Text>
                </View>
                <PressableScale
                  scaleTo={0.9}
                  onPress={() => set({ items: value.items.filter((x) => x.id !== i.id) })}
                  accessibilityLabel={`Remover ${kindLabel(i.kind)} de ${DAY_NAMES[day]}`}
                  style={styles.remove}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </PressableScale>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>Nada cadastrado na {DAY_NAMES[day]}. Este dia está livre.</Text>
        )}
        {week && free ? (
          <Text style={[styles.hint, { marginTop: 8 }]}>
            {marked.length === 0
              ? `Você não marcou horário de estudo na ${DAY_NAMES[day]}.`
              : freeToday.length
                ? `Sobra ${formatMin(freeToday.reduce((a, b) => a + b, 0))} livre na ${DAY_NAMES[day]} nos turnos que você marcou para estudar.`
                : `Na ${DAY_NAMES[day]}, os turnos que você marcou (${marked.map((p) => PERIODS[p].toLowerCase()).join(', ')}) ficaram ocupados. O cronograma não põe estudo nesse dia.`}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>Adicionar atividade</Text>

        <Text style={styles.step}>1. O que é</Text>
        <PillRow>
          {ACTIVITY_KINDS.map((k) => (
            <Pill key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />
          ))}
        </PillRow>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome (opcional)"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.step}>2. Em quais dias</Text>
        <View style={styles.dayChips}>
          {DAYS.map((d, i) => {
            const on = days.includes(i);
            return (
              <PressableScale
                key={d}
                scaleTo={0.9}
                onPress={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={DAY_NAMES[i]}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && { color: colors.ink }]}>{d}</Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={styles.step}>3. Que horas</Text>
        <View style={styles.times}>
          <TimeField label="Início" value={start} onChange={setStart} />
          <TimeField label="Fim" value={end} onChange={setEnd} />
        </View>
        <Text style={styles.label}>Deslocamento (ida e volta, cada)</Text>
        <PillRow>
          {COMMUTES.map((m) => (
            <Pill key={m} label={m ? `${m} min` : 'Nenhum'} selected={commute === m} onPress={() => setCommute(m)} />
          ))}
        </PillRow>
        {invalid ? <Text style={styles.error}>O horário final precisa ser depois do inicial.</Text> : null}
        <Button label="Adicionar nos dias marcados" onPress={add} disabled={invalid || !days.length} style={{ marginTop: 14 }} />
      </Card>

      <AddedDialog added={added} onClose={() => setAdded(null)} />
    </View>
  );
}

function AddedDialog({ added, onClose }: { added: { title: string; detail: string } | null; onClose: () => void }) {
  return (
    <Modal visible={!!added} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Fechar" />
      {added ? (
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <Animated.View entering={enterSheet()} style={styles.dialog} accessibilityRole="alert">
            <View style={styles.dialogIcon}>
              <Ionicons name="checkmark" size={26} color={colors.accentText} />
            </View>
            <Text style={styles.dialogTitle}>Adicionado à sua semana</Text>
            <Text style={styles.dialogName}>{added.title}</Text>
            <Text style={styles.dialogText}>{added.detail}</Text>
            <Button label="Ok" onPress={onClose} style={{ marginTop: 16, alignSelf: 'stretch' }} />
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

/** "segunda a sexta", "sábado e domingo" or "segunda, quarta e sexta". */
function dayList(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Todos os dias';
  if (sorted.join() === WEEKDAYS.join()) return 'De segunda a sexta';
  const names = sorted.map((d) => DAY_NAMES[d]);
  const text = names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}` : names[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "0730" or "07:30" → minutes after midnight, or null while incomplete or out of range. */
function parseTime(text: string) {
  const digits = text.replace(/\D/g, '');
  if (digits.length < 3) return null;
  const h = Number(digits.slice(0, digits.length - 2));
  const m = Number(digits.slice(-2));
  return h < 24 && m < 60 ? h * 60 + m : null;
}

// Typed as HH:MM; the colon goes in by itself.
function TimeField({ label, value, onChange, suggestions }: { label: string; value: number; onChange: (v: number) => void; suggestions?: number[] }) {
  // What's being typed; outside of editing the field just shows `value`.
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const edit = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setText(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
    const min = digits.length === 4 ? parseTime(digits) : null;
    if (min !== null) onChange(min);
  };
  const bad = focused && text.replace(/\D/g, '').length === 4 && parseTime(text) === null;

  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <TextInput
        value={focused ? text : fmtTime(value)}
        onChangeText={edit}
        onFocus={() => {
          setFocused(true);
          setText('');
        }}
        onBlur={() => {
          const min = parseTime(text);
          if (min !== null) onChange(min);
          setFocused(false);
        }}
        placeholder={fmtTime(value)}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        maxLength={5}
        accessibilityLabel={`${label}, ${fmtTime(value)}. Digite o horário em horas e minutos`}
        style={[styles.timeBox, focused && styles.timeBoxOn, bad && { borderColor: colors.danger }]}
      />
      {suggestions ? (
        <View style={styles.suggestions}>
          {suggestions.map((s) => {
            const on = s === value;
            return (
              <PressableScale
                key={s}
                scaleTo={0.9}
                onPress={() => onChange(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${label} ${fmtTime(s)}`}
                style={[styles.suggestion, on && styles.suggestionOn]}>
                <Text style={[styles.suggestionText, on && { color: colors.accent }]}>{fmtTime(s)}</Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginTop: 14, marginBottom: 8 },
  step: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, marginTop: 10 },
  block: { marginTop: 16 },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  blockTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  timeField: { flexBasis: '46%', flexGrow: 1 },
  timeLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginBottom: 5 },
  timeBox: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 18,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeBoxOn: { borderColor: colors.accent },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  suggestion: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8 },
  suggestionOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  suggestionText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11, fontVariant: ['tabular-nums'] },
  clear: { borderWidth: 1, borderColor: colors.danger, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  clearText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 12 },
  days: { flexDirection: 'row', gap: 5, marginTop: 12, marginBottom: 12 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  dayOn: { backgroundColor: colors.text, borderColor: colors.text },
  dayName: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  dayCount: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: 2 },
  dayTextOn: { color: colors.ink },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  itemTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  itemMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  remove: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  divider: { height: 1, backgroundColor: colors.line, marginTop: 18 },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    marginTop: 8,
  },
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 22,
  },
  dialogIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dialogTitle: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13 },
  dialogName: { color: colors.text, fontFamily: fonts.title, fontSize: 20, textAlign: 'center', marginTop: 4 },
  dialogText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
});
