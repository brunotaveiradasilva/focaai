// Reads a check-in and decides how the preparation changes.
import { SubjectId, subjectById, topicById } from '@/data/catalog';
import type { Activity } from '@/lib/planner';

// Shorter check-ins are kept in the history but don't complete a task or move the plan.
export const MIN_CHECKIN_MIN = 5;

export type CheckinInput = {
  activity: Activity;
  subject?: SubjectId;
  topicId?: string;
  minutes: number;
  plannedMin: number;
  feeling: 1 | 2 | 3;
  questions: number;
  correct: number;
};

export function evaluateCheckin(c: CheckinInput): { lessons: number; adj?: { boost?: number; text: string } } {
  if (c.minutes < MIN_CHECKIN_MIN || !c.subject) return { lessons: 0 };

  const subject = subjectById(c.subject).name;
  const topic = (c.topicId && topicById(c.topicId)?.title) || subject;
  const acc = c.questions > 0 ? c.correct / c.questions : null;

  // Roughly one lesson per 30 focused minutes of theory; practice consolidates more slowly.
  let lessons =
    c.activity === 'teoria' ? Math.max(1, Math.round(c.minutes / 30)) : c.activity === 'exercicios' ? Math.max(1, Math.round(c.minutes / 45)) : 0;
  if (c.feeling === 3) lessons = Math.max(lessons ? 1 : 0, lessons - 1);

  if (acc !== null && c.questions >= 5 && acc < 0.6) {
    // No lessons credited: the topic stays current, so it really comes back in the plan.
    return {
      lessons: 0,
      adj: {
        boost: 1,
        text: `Você acertou ${c.correct} de ${c.questions} questões de ${topic}. ${subject} ganhou mais espaço na sua semana e você continua nesse assunto até firmar a base.`,
      },
    };
  }
  if (c.feeling === 3 && c.activity === 'teoria') {
    return {
      lessons,
      adj: {
        boost: 0.5,
        text: `${topic} foi difícil hoje. Colocamos mais blocos de ${subject} nos próximos dias para você praticar com calma.`,
      },
    };
  }
  if (acc !== null && c.questions >= 5 && acc >= 0.8) {
    return {
      lessons: lessons + 1,
      adj: {
        boost: -0.5,
        text: `${Math.round(acc * 100)}% de acerto em ${topic}. Você avançou mais rápido e liberamos tempo para outras matérias.`,
      },
    };
  }
  return { lessons };
}

export function formatMin(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
