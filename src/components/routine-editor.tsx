import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Pill, PillRow, PressableScale } from '@/components/ui';
import { formatMin } from '@/lib/coach';
import { DAYS, DAY_NAMES, PERIODS } from '@/lib/planner';
import {
  ACTIVITY_KINDS,
  ActivityKind,
  COMMUTES,
  PRESETS,
  Routine,
  RoutineItem,
  fmtTime,
  freeMinutes,
  kindLabel,
  newItemId,
} from '@/lib/routine';
import { colors, fonts } from '@/theme/tokens';

const STEP = 15;
const DAY_MIN = 24 * 60;
const WEEKDAYS = [0, 1, 2, 3, 4];

// Fixed commitments of the week: wake/sleep/lunch, recurring activities per day, and the
// study time each day keeps in the periods the student marked as free (`week`).
export function RoutineEditor({
  value,
  onChange,
  week,
}: {
  value: Routine;
  onChange: (r: Routine) => void;
  week?: boolean[];
}) {
  const [day, setDay] = useState(0);
  const [kind, setKind] = useState<ActivityKind>('escola');
  const [name, setName] = useState('');
  const [days, setDays] = useState<number[]>([0]);
  const [start, setStart] = useState(18 * 60);
  const [end, setEnd] = useState(19 * 60 + 30);
  const [commute, setCommute] = useState(0);

  const set = (patch: Partial<Routine>) => onChange({ ...value, ...patch });
  const ofDay = value.items.filter((i) => i.day === day).sort((a, b) => a.start - b.start);
  const invalid = end <= start;

  // Presets replace the same kind of activity on weekdays, so tapping twice doesn't duplicate.
  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const kept = value.items.filter((i) => !(WEEKDAYS.includes(i.day) && i.kind === p.kind));
    const added = WEEKDAYS.map((d): RoutineItem => ({ id: newItemId(), kind: p.kind, day: d, start: p.start, end: p.end, commute: 0 }));
    set({ items: [...kept, ...added] });
  };

  const add = () => {
    if (invalid || !days.length) return;
    const label = name.trim() || undefined;
    const added = days.map((d): RoutineItem => ({ id: newItemId(), kind, name: label, day: d, start, end, commute }));
    set({ items: [...value.items, ...added] });
    setName('');
  };

  const marked = week ? [0, 1, 2].filter((p) => week[p * 7 + day]) : [];
  const freeToday = marked.map((p) => freeMinutes(value, day, p)).filter((m) => m >= 30);

  return (
    <View>
      <View style={styles.times}>
        <TimeField label="Acordo às" value={value.wake} onChange={(wake) => set({ wake })} />
        <TimeField label="Durmo às" value={value.sleep} onChange={(sleep) => set({ sleep })} />
        <TimeField label="Almoço de" value={value.lunchStart} onChange={(lunchStart) => set({ lunchStart })} />
        <TimeField label="até" value={value.lunchEnd} onChange={(lunchEnd) => set({ lunchEnd })} />
      </View>

      <Text style={styles.label}>Atalhos para segunda a sexta</Text>
      <PillRow>
        {PRESETS.map((p) => (
          <Pill key={p.id} label={p.label} onPress={() => applyPreset(p)} />
        ))}
        {value.items.length ? (
          <PressableScale scaleTo={0.92} onPress={() => set({ items: [] })} style={styles.clear} accessibilityRole="button">
            <Text style={styles.clearText}>Limpar tudo</Text>
          </PressableScale>
        ) : null}
      </PillRow>

      <View style={styles.days}>
        {DAYS.map((d, i) => {
          const on = i === day;
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
              accessibilityLabel={`${DAY_NAMES[i]}, ${value.items.filter((x) => x.day === i).length} atividades`}
              style={[styles.day, on && styles.dayOn]}>
              <Text style={[styles.dayName, on && styles.dayTextOn]}>{d}</Text>
              <Text style={[styles.dayCount, on && styles.dayTextOn]}>{value.items.filter((x) => x.day === i).length}</Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={styles.section}>{DAYS[day]}: o que já ocupa seu dia</Text>
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
                <Text style={styles.removeText}>Remover</Text>
              </PressableScale>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>Nada cadastrado. Este dia está livre.</Text>
      )}
      {week ? (
        <Text style={[styles.hint, { marginTop: 8 }]}>
          {marked.length === 0
            ? `Você não marcou horário de estudo na ${DAY_NAMES[day]}.`
            : freeToday.length
              ? `Sobra ${formatMin(freeToday.reduce((a, b) => a + b, 0))} livre na ${DAY_NAMES[day]} nos turnos que você marcou para estudar.`
              : `Na ${DAY_NAMES[day]}, os turnos que você marcou (${marked.map((p) => PERIODS[p].toLowerCase()).join(', ')}) ficaram ocupados. O cronograma não põe estudo nesse dia.`}
        </Text>
      ) : null}

      <View style={styles.divider} />
      <Text style={styles.section}>Adicionar atividade</Text>
      <Text style={[styles.hint, { marginBottom: 10 }]}>Escolha o tipo e os dias em que ela se repete.</Text>
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
    </View>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const shift = (d: number) => onChange((value + d + DAY_MIN) % DAY_MIN);
  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeBox}>
        <PressableScale scaleTo={0.85} onPress={() => shift(-STEP)} accessibilityLabel={`${label}: 15 minutos antes`} style={styles.timeBtn}>
          <Ionicons name="remove" size={16} color={colors.text} />
        </PressableScale>
        <Text style={styles.timeVal} accessibilityLabel={`${label} ${fmtTime(value)}`}>
          {fmtTime(value)}
        </Text>
        <PressableScale scaleTo={0.85} onPress={() => shift(STEP)} accessibilityLabel={`${label}: 15 minutos depois`} style={styles.timeBtn}>
          <Ionicons name="add" size={16} color={colors.text} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginTop: 14, marginBottom: 8 },
  section: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14, marginTop: 16, marginBottom: 8 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, marginTop: 10 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  timeField: { flexBasis: '46%', flexGrow: 1 },
  timeLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginBottom: 5 },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 4,
  },
  timeBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  timeVal: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, fontVariant: ['tabular-nums'] },
  clear: { borderWidth: 1, borderColor: colors.danger, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  clearText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 13 },
  days: { flexDirection: 'row', gap: 5, marginTop: 14 },
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
  remove: { borderWidth: 1, borderColor: colors.danger, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  removeText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 12 },
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
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 6 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12 },
});
