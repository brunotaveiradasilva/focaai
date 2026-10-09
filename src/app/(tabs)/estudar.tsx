import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CheckinSheet, CheckinTarget, MaterialLinks } from '@/components/checkin-sheet';
import { Chunky, GroupHeader, PathNode, SubjectChip, UnitBanner } from '@/components/roadmap';
import { Sheet } from '@/components/sheet';
import { IconName, SUBJECT_ICON, onColor, shade } from '@/components/subject-style';
import { PressableScale, ProgressBar, Screen } from '@/components/ui';
import {
  RoadTopic,
  SUBJECTS,
  SubjectId,
  TRACK_LABEL,
  VESTIBULARES,
  areaOfSubject,
  isMinor,
  roadmap,
  subjectById,
} from '@/data/catalog';
import { editalOfExam, examWeight } from '@/data/edital';
import { currentTopic, examIdsOf, topicState } from '@/lib/planner';
import { useApp } from '@/store/app';
import { colors, fonts } from '@/theme/tokens';

// Horizontal offsets that make the path snake left and right, Duolingo-style.
const OFFSETS = [0, 48, 72, 48, 0, -48, -72, -48];

const STATUS_LABEL = { done: 'Concluído', doing: 'Em andamento', todo: 'Não iniciado' } as const;

const examName = (id: string) => (id === 'enem' ? 'ENEM' : (VESTIBULARES.find((v) => v.id === id)?.name ?? id));

// How each followed exam's edital treats a topic, e.g. "ENEM: citado no edital".
function weightLines(topicId: string, examIds: string[]) {
  return examIds.map((id) => {
    if (!editalOfExam(id)) return `${examName(id)}: edital ainda não mapeado`;
    const w = examWeight(id, topicId);
    return `${examName(id)}: ${w >= 1 ? 'citado no edital' : w > 0 ? 'citado em parte' : 'fora do edital'}`;
  });
}

// Roadmap — livre: qualquer assunto, na ordem que o aluno quiser
export default function Estudar() {
  const profile = useApp((s) => s.profile)!;
  const progress = useApp((s) => s.progress);
  const focus = useApp((s) => s.focus);
  const setFocus = useApp((s) => s.setFocus);
  const setTopicDone = useApp((s) => s.setTopicDone);

  const weak = SUBJECTS.filter((s) => profile.levels[s.id] === 1).map((s) => s.id);
  const [subjectId, setSubjectId] = useState<SubjectId>(weak[0] ?? 'mat');
  const [open, setOpen] = useState<RoadTopic | null>(null);
  const [checkin, setCheckin] = useState<CheckinTarget | null>(null);

  const subject = subjectById(subjectId);
  const examIds = examIdsOf(profile);
  const path = roadmap(subjectId, examIds);
  const current = currentTopic(subjectId, progress, focus, examIds);
  const isDone = (t: RoadTopic) => topicState(t, progress) === 'done';
  const content = path.filter((t) => !t.final);
  const sorted = [...SUBJECTS].sort((a, b) => Number(weak.includes(b.id)) - Number(weak.includes(a.id)));
  const doneOf = (topic: RoadTopic) => Math.min(topic.lessons, progress[topic.id] ?? 0);
  const groupStats = (groupId: string) => {
    const g = path.filter((t) => t.groupId === groupId);
    return { done: g.filter(isDone).length, total: g.length };
  };

  const openState = open ? topicState(open, progress) : null;
  const isFocus = !!open && focus[subjectId] === open.id;

  return (
    <Screen>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingRight: 16 }}>
        {sorted.map((s) => (
          <SubjectChip key={s.id} subject={s} selected={s.id === subjectId} weak={weak.includes(s.id)} onPress={() => setSubjectId(s.id)} />
        ))}
      </ScrollView>

      {/* Keyed by subject so the banner and nodes replay their entrance on every switch. */}
      <View key={subjectId}>
        <UnitBanner
          subject={subject}
          done={content.filter(isDone).length}
          total={content.length}
          currentTitle={current.title}
          examName={TRACK_LABEL[profile.track]}
        />
        <View style={styles.free}>
          <Ionicons name="shuffle" size={14} color={colors.muted} />
          <Text style={styles.freeText}>
            Caminho livre: toque em qualquer assunto para estudar ou definir como seu foco. Os nós menores são
            assuntos que seu edital cita só em parte.
          </Text>
        </View>
        <View style={styles.path}>
          {path.map((topic, i) => (
            <Fragment key={topic.id}>
              {topic.groupId !== path[i - 1]?.groupId ? (
                <GroupHeader title={topic.groupName} color={subject.color} {...groupStats(topic.groupId)} />
              ) : null}
              <PathNode
                topic={topic}
                subject={subject}
                state={topicState(topic, progress)}
                done={doneOf(topic)}
                isCurrent={topic.id === current.id}
                isFocus={focus[subjectId] === topic.id}
                index={i}
                offset={OFFSETS[i % OFFSETS.length]}
                onPress={() => setOpen(topic)}
              />
            </Fragment>
          ))}
        </View>
      </View>

      <Sheet visible={!!open} onClose={() => setOpen(null)}>
        {open && openState ? (
          <View>
            <View style={styles.sheetHead}>
              <View style={[styles.sheetIcon, { backgroundColor: subject.color, borderColor: shade(subject.color) }]}>
                <Ionicons name={open.final ? 'trophy' : SUBJECT_ICON[subject.id]} size={26} color={onColor(subject.color)} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.sheetSt, { color: subject.color }]}>
                  {(isMinor(open) ? 'Peso menor · ' : '') + STATUS_LABEL[openState].toUpperCase()}
                  {isFocus ? ' · SEU FOCO' : ''}
                </Text>
                <Text style={styles.sheetT}>{open.title}</Text>
              </View>
            </View>
            <Text style={styles.sheetD}>
              {open.final ? open.desc : [open.groupName, ...weightLines(open.id, examIds)].join('\n')}
            </Text>
            <View style={{ marginVertical: 14 }}>
              <ProgressBar value={doneOf(open) / open.lessons} color={subject.color} />
              <Text style={styles.meta}>
                {doneOf(open)} de {open.lessons} aulas
              </Text>
            </View>

            {open.final ? (
              <Chunky
                width="100%"
                height={50}
                radius={14}
                face={subject.color}
                base={shade(subject.color)}
                label="Fazer simulado"
                onPress={() => {
                  setOpen(null);
                  router.push({ pathname: '/questoes', params: { area: areaOfSubject(subjectId) } });
                }}>
                <Text style={[styles.cta, { color: onColor(subject.color) }]}>FAZER SIMULADO DA ÁREA</Text>
              </Chunky>
            ) : (
              <Chunky
                width="100%"
                height={50}
                radius={14}
                face={subject.color}
                base={shade(subject.color)}
                label="Registrar estudo"
                onPress={() => {
                  const t = open;
                  setOpen(null);
                  setCheckin({ subject: subjectId, topicId: t.id });
                }}>
                <Text style={[styles.cta, { color: onColor(subject.color) }]}>REGISTRAR ESTUDO</Text>
              </Chunky>
            )}

            <View style={styles.actions}>
              <Action
                icon={isFocus ? 'flag' : 'flag-outline'}
                label={isFocus ? 'Remover foco' : 'Definir como foco'}
                onPress={() => setFocus(subjectId, isFocus ? null : open.id)}
              />
              <Action
                icon={openState === 'done' ? 'arrow-undo' : 'checkmark-done'}
                label={openState === 'done' ? 'Desmarcar' : 'Já sei esse'}
                onPress={() => setTopicDone(open.id, openState !== 'done')}
              />
            </View>
            <Text style={styles.hint}>
              {isFocus
                ? `Seus próximos blocos de ${subject.name} vão trabalhar este assunto.`
                : `"Definir como foco" faz o cronograma trabalhar este assunto nos próximos blocos de ${subject.name}.`}
            </Text>

            <Text style={styles.section}>Onde estudar</Text>
            <MaterialLinks topicTitle={open.title} subjectName={subject.name} />
          </View>
        ) : null}
      </Sheet>

      <CheckinSheet target={checkin} onClose={() => setCheckin(null)} />
    </Screen>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.94} onPress={onPress} style={styles.action} accessibilityRole="button">
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text style={styles.actionText}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chips: { marginBottom: 14, flexGrow: 0 },
  free: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6, paddingHorizontal: 2 },
  freeText: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  path: { alignItems: 'center', gap: 22, paddingTop: 28, paddingBottom: 24 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  sheetIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSt: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, marginBottom: 2 },
  sheetT: { color: colors.text, fontFamily: fonts.title, fontSize: 20 },
  sheetD: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  cta: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 16 },
  section: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginBottom: 8 },
});
