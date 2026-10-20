import { create } from 'zustand';

import { subjectById, topicById } from '@/data/catalog';
import type { Score } from '@/lib/types';

/** A post the app offers to publish after an achievement; the student can edit it or skip. */
export type ShareDraft = { title: string; text: string };

type ShareState = {
  draft: ShareDraft | null;
  offer: (draft: ShareDraft) => void;
  close: () => void;
};

// One offer at a time, shown by the sheet in the root layout over whatever screen is open.
export const useShare = create<ShareState>()((set) => ({
  draft: null,
  offer: (draft) => set({ draft }),
  close: () => set({ draft: null }),
}));

/** A roadmap topic just completed. */
export function offerTopic(topicId: string) {
  const topic = topicById(topicId);
  if (!topic) return;
  useShare.getState().offer({
    title: 'Mais uma etapa concluída!',
    text: `Concluí "${topic.title}" em ${subjectById(topic.subject).name} no meu roadmap! 📚`,
  });
}

/** A simulado just finished. */
export function offerSimulado(score: Score | undefined) {
  if (!score?.total) return;
  const pct = Math.round((score.correct / score.total) * 100);
  useShare.getState().offer({
    title: 'Simulado terminado!',
    // A low score still counts as showing up; the text says so instead of celebrating the number.
    text:
      pct >= 60
        ? `Terminei um simulado: ${score.correct} de ${score.total} questões certas (${pct}%). Bora pro próximo! 💪`
        : `Mais um simulado feito (${score.correct} de ${score.total}). Cada um mostra onde revisar. 📈`,
  });
}

