// Carries progress from the v2 roadmap (a few broad topics per subject) over to the
// content tree. Each old topic covered a group, or a few topics, of the tree; the share of
// its lessons the student had done becomes that share of those topics done, in order.
import { TOPICS } from '@/data/catalog';

const V2: Record<string, [lessons: number, covers: string[]]> = {
  'mat.fund': [18, ['mat.aritmetica-e-algebra-basica']],
  'mat.func': [24, ['mat.funcoes']],
  'mat.geop': [20, ['mat.geometria-plana']],
  'mat.geoa': [14, ['mat.geometria-analitica']],
  'mat.prob': [16, ['mat.contagem-probabilidade-e-estatistica']],
  'mat.pa': [6, ['mat.funcoes.sequencias-pa-e-pg']],
  'mat.trig': [8, ['mat.trigonometria']],
  'mat.esp': [8, ['mat.geometria-espacial']],
  'por.int': [14, ['por.lingua']],
  'por.gram': [16, ['por.gramatica']],
  'por.lit': [12, ['por.literatura']],
  'red.est': [6, ['red.redacao.estrutura-dissertativo-argumentativa']],
  'red.comp': [10, ['red.redacao.tese-e-argumentacao', 'red.redacao.coesao-textual']],
  'red.rep': [8, ['red.redacao.repertorio-sociocultural', 'red.redacao.proposta-de-intervencao']],
  'fis.cin': [12, ['fis.mecanica.cinematica-escalar', 'fis.mecanica.cinematica-vetorial-e-lancamentos']],
  'fis.din': [
    16,
    [
      'fis.mecanica.leis-de-newton',
      'fis.mecanica.atrito-e-plano-inclinado',
      'fis.mecanica.trabalho-energia-e-potencia',
      'fis.mecanica.impulso-e-quantidade-de-movimento',
    ],
  ],
  'fis.ele': [14, ['fis.eletricidade-e-magnetismo']],
  'fis.ond': [10, ['fis.ondas-e-optica']],
  'qui.ger': [14, ['qui.quimica-geral']],
  'qui.est': [12, ['qui.fisico-quimica.estequiometria', 'qui.fisico-quimica.solucoes-e-concentracao']],
  'qui.fq': [
    14,
    [
      'qui.fisico-quimica.termoquimica',
      'qui.fisico-quimica.cinetica-quimica',
      'qui.fisico-quimica.equilibrio-quimico',
      'qui.fisico-quimica.eletroquimica',
    ],
  ],
  'qui.org': [16, ['qui.quimica-organica']],
  'bio.cel': [12, ['bio.citologia-e-bioquimica']],
  'bio.gen': [12, ['bio.genetica-e-evolucao']],
  'bio.eco': [12, ['bio.ecologia']],
  'bio.fis': [14, ['bio.fisiologia-e-saude']],
  'his.bra': [18, ['his.historia-do-brasil']],
  'his.ger': [16, ['his.historia-geral']],
  'geo.fis': [12, ['geo.geografia-fisica']],
  'geo.hum': [14, ['geo.geografia-humana']],
};

const covered = (prefixes: string[]) =>
  TOPICS.filter((t) => prefixes.some((p) => t.id === p || t.id.startsWith(`${p}.`)));

export function migrateProgress(old: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, done] of Object.entries(old)) {
    const v2 = V2[id];
    // Closing simulado nodes kept their ids.
    if (!v2) {
      out[id] = Math.max(out[id] ?? 0, done);
      continue;
    }
    const topics = covered(v2[1]);
    let left = Math.min(1, done / v2[0]) * topics.reduce((a, t) => a + t.lessons, 0);
    for (const t of topics) {
      const n = Math.min(t.lessons, Math.round(left));
      if (n <= 0) break;
      out[t.id] = Math.max(out[t.id] ?? 0, n);
      left -= n;
    }
  }
  return out;
}
