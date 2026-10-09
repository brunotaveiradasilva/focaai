// Question bank backed by the public ENEM API (api.enem.dev): real questions from
// 2009–2023, public domain. Whole exams are downloaded once and cached on the device.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Area } from '@/data/catalog';
import type { SimQuestion } from '@/store/app';

const API = 'https://api.enem.dev/v1';
const CACHE = 'enem:v1';

export const FIRST_YEAR = 2009;
export const LAST_YEAR = 2023;
export const RECENT_FROM = 2019;

// A build published as a standalone web page can't reach the API (its host blocks other
// sites), so it ships a snapshot of a few exams next to the page instead. Figures are
// hosted on another site too, so questions that need them are left out in that mode.
const SNAPSHOT: { base: string; years: number[] } | undefined = (globalThis as { __FOCA_ENEM_SNAPSHOT__?: { base: string; years: number[] } }).__FOCA_ENEM_SNAPSHOT__;
export const SNAPSHOT_YEARS = SNAPSHOT?.years ?? null;

const hasFigure = (q: SimQuestion) =>
  q.files.length > 0 || /!\[/.test(q.context + q.intro) || q.alternatives.some((a) => a.file);

type RawQuestion = {
  index: number;
  language: string | null;
  context: string | null;
  files: string[];
  correctAlternative: string | null;
  alternativesIntroduction: string | null;
  alternatives: { letter: string; text: string | null; file: string | null }[];
};

// The API's `discipline` field is wrong for a few questions per exam, so the area comes
// from the question number instead, following the official layout of each edition.
export function areaOfIndex(year: number, index: number): Area {
  const block = Math.min(3, Math.floor((index - 1) / 45));
  const layout: Area[] =
    year >= 2017
      ? ['linguagens', 'humanas', 'natureza', 'matematica']
      : ['humanas', 'natureza', 'linguagens', 'matematica'];
  return layout[block];
}

// The API allows about one uncached request per second; queue calls to stay under it.
let nextSlot = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, attempt = 0): Promise<{ questions: RawQuestion[] }> {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Date.now() + wait + 1100;
  await sleep(wait);
  const res = await fetch(url);
  if (res.status === 429 && attempt < 3) {
    const retry = Number(res.headers.get('Retry-After')) || 2000;
    await sleep(retry);
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`ENEM API ${res.status}`);
  return res.json();
}

const memory = new Map<string, SimQuestion[]>();

function convert(year: number, lang: string, raw: RawQuestion[]): SimQuestion[] {
  const seen = new Set<number>();
  const out: SimQuestion[] = [];
  for (const q of raw) {
    if (seen.has(q.index)) continue;
    if (q.language && q.language !== lang) continue;
    // A few questions reference images the API couldn't extract; they can't be answered.
    if (JSON.stringify(q).includes('broken-image')) continue;
    if (!q.correctAlternative || q.alternatives.length < 2) continue;
    seen.add(q.index);
    out.push({
      key: `${year}-${q.index}`,
      year,
      index: q.index,
      area: areaOfIndex(year, q.index),
      context: q.context ?? '',
      intro: q.alternativesIntroduction ?? '',
      files: q.files ?? [],
      alternatives: q.alternatives.map((a) => ({ letter: a.letter, text: a.text, file: a.file })),
      correct: q.correctAlternative,
    });
  }
  return out;
}

export async function loadYear(year: number, lang: string): Promise<SimQuestion[]> {
  const key = `${CACHE}:${year}:${lang}`;
  const hit = memory.get(key);
  if (hit) return hit;
  if (SNAPSHOT) {
    const res = await fetch(`${SNAPSHOT.base}${year}-${lang}.json`);
    if (!res.ok) throw new Error(`ENEM snapshot ${res.status}`);
    const questions = convert(year, lang, (await res.json()).questions).filter((q) => !hasFigure(q));
    memory.set(key, questions);
    return questions;
  }
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as SimQuestion[];
      memory.set(key, parsed);
      return parsed;
    }
  } catch {
    // Storage unavailable: fall through to the network.
  }
  const raw: RawQuestion[] = [];
  for (const offset of [0, 50, 100, 150]) {
    const page = await getJson(`${API}/exams/${year}/questions?limit=50&offset=${offset}&language=${lang}`);
    raw.push(...page.questions);
  }
  const questions = convert(year, lang, raw);
  memory.set(key, questions);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(questions));
  } catch {
    // Not cached; it will be downloaded again next time.
  }
  return questions;
}

async function cachedYears(lang: string, years: number[]) {
  const out: number[] = [];
  for (const y of years) {
    const key = `${CACHE}:${y}:${lang}`;
    if (memory.has(key)) out.push(y);
    else {
      try {
        if (await AsyncStorage.getItem(key)) out.push(y);
      } catch {
        // ignore
      }
    }
  }
  return out;
}

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export type SimuladoConfig = {
  areas: Area[];
  count: number;
  range: 'recentes' | 'todos';
  lang: 'ingles' | 'espanhol';
  // Questions answered before; avoided while there are fresh ones.
  seen: Set<string>;
};

export async function buildSimulado(cfg: SimuladoConfig, onProgress?: (msg: string) => void): Promise<SimQuestion[]> {
  const from = cfg.range === 'recentes' ? RECENT_FROM : FIRST_YEAR;
  const years = SNAPSHOT?.years ?? Array.from({ length: LAST_YEAR - from + 1 }, (_, i) => from + i);
  const per: Partial<Record<Area, number>> = {};
  cfg.areas.forEach((a, i) => {
    per[a] = Math.floor(cfg.count / cfg.areas.length) + (i < cfg.count % cfg.areas.length ? 1 : 0);
  });

  // Already-downloaded exams cost nothing; download at least one new exam for variety
  // until two are cached, and more only if the pool is still too small.
  // Snapshot exams are local files, so they all count as already downloaded.
  const cached = SNAPSHOT ? years : await cachedYears(cfg.lang, years);
  const order = [...shuffle(cached), ...shuffle(years.filter((y) => !cached.includes(y)))];
  const pool: Partial<Record<Area, SimQuestion[]>> = {};
  const enough = () => cfg.areas.every((a) => (pool[a]?.filter((q) => !cfg.seen.has(q.key)).length ?? 0) >= per[a]!);

  let downloaded = 0;
  for (const y of order) {
    const isCached = cached.includes(y);
    if (!isCached && enough() && (cached.length >= 2 || downloaded >= 1)) break;
    if (!isCached) onProgress?.(`Baixando a prova do ENEM ${y}…`);
    const qs = await loadYear(y, cfg.lang);
    for (const q of qs) if (cfg.areas.includes(q.area)) (pool[q.area] ??= []).push(q);
    if (!isCached) downloaded++;
  }

  // Keep the exam's area order, like the real test.
  return cfg.areas.flatMap((a) => {
    const all = pool[a] ?? [];
    const fresh = shuffle(all.filter((q) => !cfg.seen.has(q.key)));
    const old = shuffle(all.filter((q) => cfg.seen.has(q.key)));
    return [...fresh, ...old].slice(0, per[a]);
  });
}
