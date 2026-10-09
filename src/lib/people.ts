// Pessoas runs on sample profiles until accounts and a server exist. Everything here is
// fictional and the screen labels it as an example; the matching logic is the real one
// and will run unchanged on real profiles later.
import { ExamTrack, SubjectId, TIERS, courseById } from '@/data/catalog';
import type { Profile } from '@/store/app';

export type Person = {
  id: string;
  name: string;
  city: string;
  track: ExamTrack;
  cycle: number;
  courseId: string;
  periods: number[]; // 0 manhã, 1 tarde, 2 noite
  strong: SubjectId[];
  weak: SubjectId[];
  streak: number;
  bio: string;
};

export const SAMPLE_PEOPLE: Person[] = [
  { id: 'p1', name: 'Júlia M.', city: 'Campo Grande, MS', track: 'ambos', cycle: 2026, courseId: 'medicina', periods: [2], strong: ['bio', 'qui'], weak: ['mat', 'fis'], streak: 21, bio: 'Terceiro ano, estudo à noite depois da escola.' },
  { id: 'p2', name: 'Rafael S.', city: 'São Paulo, SP', track: 'vestibulares', cycle: 2026, courseId: 'engenharias', periods: [0, 2], strong: ['mat', 'fis'], weak: ['red', 'his'], streak: 9, bio: 'Cursinho de manhã, revisão à noite. Fuvest e Unicamp.' },
  { id: 'p3', name: 'Ana Clara T.', city: 'Dourados, MS', track: 'enem', cycle: 2026, courseId: 'direito', periods: [1, 2], strong: ['red', 'por', 'his'], weak: ['mat'], streak: 14, bio: 'Foco em redação nota mil. Topo trocar correções.' },
  { id: 'p4', name: 'Pedro H.', city: 'Campinas, SP', track: 'vestibulares', cycle: 2026, courseId: 'computacao', periods: [2], strong: ['mat'], weak: ['bio', 'qui'], streak: 5, bio: 'Estudo programação nas horas vagas, Unicamp é o sonho.' },
  { id: 'p5', name: 'Larissa F.', city: 'Belo Horizonte, MG', track: 'enem', cycle: 2027, courseId: 'medicina', periods: [0, 1], strong: ['bio'], weak: ['fis', 'mat'], streak: 32, bio: 'Segundo ano, começando cedo para Medicina.' },
  { id: 'p6', name: 'Gustavo R.', city: 'Curitiba, PR', track: 'enem', cycle: 2026, courseId: 'psicologia', periods: [1], strong: ['por', 'his', 'geo'], weak: ['qui'], streak: 3, bio: 'Voltando a estudar depois de um ano trabalhando.' },
  { id: 'p7', name: 'Beatriz L.', city: 'Três Lagoas, MS', track: 'ambos', cycle: 2026, courseId: 'odontologia', periods: [2], strong: ['qui', 'mat'], weak: ['red'], streak: 11, bio: 'ENEM e UFMS. Gosto de resolver lista em dupla.' },
  { id: 'p8', name: 'Thiago A.', city: 'Recife, PE', track: 'enem', cycle: 2026, courseId: 'eng-civil', periods: [0], strong: ['fis', 'mat'], weak: ['por'], streak: 7, bio: 'Estudo cedinho antes do trabalho.' },
  { id: 'p9', name: 'Mariana C.', city: 'Rio de Janeiro, RJ', track: 'enem', cycle: 2026, courseId: 'ri', periods: [1, 2], strong: ['geo', 'his', 'red'], weak: ['fis'], streak: 18, bio: 'Leio muito sobre geopolítica, posso ajudar em Humanas.' },
  { id: 'p10', name: 'Lucas V.', city: 'Goiânia, GO', track: 'enem', cycle: 2027, courseId: 'administracao', periods: [2], strong: ['mat'], weak: ['bio'], streak: 2, bio: 'Primeiro ano estudando sério. Busco parceiro de rotina.' },
];

const periodsOf = (p: Profile) => [0, 1, 2].filter((period) => p.week.slice(period * 7, period * 7 + 7).some(Boolean));
const weakOf = (p: Profile) => (Object.keys(p.levels) as SubjectId[]).filter((s) => p.levels[s] === 1);
const strongOf = (p: Profile) => (Object.keys(p.levels) as SubjectId[]).filter((s) => p.levels[s] === 3);

export type Match = { person: Person; score: number; reasons: string[] };

export function matchPeople(profile: Profile): Match[] {
  const myCourse = courseById(profile.courseId);
  const myPeriods = periodsOf(profile);
  const myWeak = weakOf(profile);
  const myStrong = strongOf(profile);
  const PERIOD = ['manhã', 'tarde', 'noite'];

  return SAMPLE_PEOPLE.map((person) => {
    let score = 0;
    const reasons: string[] = [];
    const course = courseById(person.courseId);
    if (person.courseId === profile.courseId) {
      score += 30;
      reasons.push(`Também quer ${course.name}`);
    } else if (course.tier === myCourse.tier) {
      score += 15;
      reasons.push(`Curso de concorrência ${TIERS[course.tier].label.toLowerCase()}, como o seu`);
    }
    if (person.cycle === profile.cycle && (person.track === profile.track || person.track === 'ambos' || profile.track === 'ambos')) {
      score += 20;
      reasons.push(`Mesma prova em ${person.cycle}`);
    }
    const shared = person.periods.filter((p) => myPeriods.includes(p));
    if (shared.length) {
      score += 20;
      reasons.push(`Estuda de ${shared.map((p) => PERIOD[p]).join(' e ')}, como você`);
    }
    // Complementary strengths make the best study partners.
    const helps = person.strong.filter((s) => myWeak.includes(s));
    if (helps.length) score += 15 + 5 * helps.length;
    const helped = person.weak.filter((s) => myStrong.includes(s));
    if (helped.length) score += 5;
    return { person, score: Math.min(99, score + 10), reasons };
  }).sort((a, b) => b.score - a.score);
}

export function helpsWith(profile: Profile, person: Person) {
  return person.strong.filter((s) => profile.levels[s] === 1);
}

export type Group = { id: string; name: string; desc: string };

export function groupsFor(profile: Profile): Group[] {
  const course = courseById(profile.courseId);
  const periods = periodsOf(profile);
  const night = periods.includes(2);
  return [
    { id: `curso-${course.id}-${profile.cycle}`, name: `${course.name} · ${profile.cycle}`, desc: 'Quem quer o mesmo curso que você, na mesma prova.' },
    { id: `redacao-${profile.cycle}`, name: 'Redação nota 1000', desc: 'Um tema por semana e correção entre colegas.' },
    night
      ? { id: 'turno-noite', name: 'Estudo noturno', desc: 'Sessões juntos das 19h às 22h, com check-in no fim.' }
      : { id: 'turno-manha', name: 'Clube das 6h', desc: 'Quem começa cedo e quer companhia para manter o ritmo.' },
    { id: 'questoes-dia', name: '10 questões por dia', desc: 'Desafio diário do Banco de Questões, com ranking semanal.' },
  ];
}
