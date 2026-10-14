import { FAMILIES, type Recipe } from '../data/recipes';
import type { Meta } from './db';
import { questionsFor, type Question } from './questions';
import { level, Rating, State, type Card, type Grade } from './srs';
import { shuffle } from './recipe-utils';

/* ───────── 바리스타 등급 ───────── */
export const RANKS = [
  { xp: 0, name: '견습 바리스타' },
  { xp: 300, name: '바리스타' },
  { xp: 1000, name: '시니어 바리스타' },
  { xp: 2500, name: '헤드 바리스타' },
  { xp: 5000, name: '점장' }
];

export function rankOf(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  return {
    index: i,
    name: cur.name,
    next: next?.name,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    toNext: next ? next.xp - xp : 0
  };
}

export const xpFor = (combo: number) => 10 + Math.min(combo, 5) * 2;

/* ───────── 한 판 구성 ───────── */
export type PlayItem = { type: 'intro'; recipeId: string } | { type: 'q'; q: Question; retry?: boolean };

export interface Round {
  items: PlayItem[];
  recipeIds: string[];
}

const MAX_Q = 12;

function build(newOnes: Recipe[], review: Recipe[], cards: Record<string, Card>, all: Recipe[]): Round {
  const reviewQs: Question[] = [];
  for (const r of review) reviewQs.push(...questionsFor(r, all, level(cards[r.id]) <= 2 ? 2 : 1));
  const pool = shuffle(reviewQs).slice(0, Math.max(0, MAX_Q - newOnes.length * 2));
  const out: PlayItem[] = [];
  const pending: Question[] = [];
  // 새 메뉴: 소개 카드 → (복습 문제 2개) → … → 마지막에 새 메뉴 문제를 섞어서
  for (const r of newOnes) {
    out.push({ type: 'intro', recipeId: r.id });
    out.push(...pool.splice(0, 2).map((q) => ({ type: 'q' as const, q })));
    pending.push(...questionsFor(r, all, 2));
  }
  out.push(...shuffle([...pending, ...pool]).map((q) => ({ type: 'q' as const, q })));
  const ids = [...new Set([...newOnes.map((r) => r.id), ...review.map((r) => r.id)])];
  return { items: out, recipeIds: ids };
}

const isNew = (c?: Card) => !c || c.state === State.New;

/** 오늘의 주문: 복습할 메뉴 + 오늘 몫의 새 메뉴 */
export function dailyRound(recipes: Recipe[], cards: Record<string, Card>, newLeft: number): Round {
  const now = Date.now();
  const due = recipes
    .filter((r) => !isNew(cards[r.id]) && cards[r.id].due.getTime() <= now)
    .sort((a, b) => cards[a.id].due.getTime() - cards[b.id].due.getTime())
    .slice(0, 8);
  const fresh = recipes.filter((r) => isNew(cards[r.id])).slice(0, Math.min(newLeft, 3));
  return build(fresh, due, cards, recipes);
}

/** 한 판 더: 오늘 몫이 끝나도 계속 — 새 메뉴 조금 + 약한 메뉴 */
export function extraRound(recipes: Recipe[], cards: Record<string, Card>, logs: { recipeId: string; rating: number; ts: number }[]): Round {
  const fresh = recipes.filter((r) => isNew(cards[r.id])).slice(0, 2);
  const wrongCount = new Map<string, number>();
  for (const l of logs) if (l.rating <= Rating.Hard) wrongCount.set(l.recipeId, (wrongCount.get(l.recipeId) ?? 0) + 1);
  const learned = recipes.filter((r) => !isNew(cards[r.id]));
  const weak = [...learned]
    .sort((a, b) => (wrongCount.get(b.id) ?? 0) - (wrongCount.get(a.id) ?? 0) || cards[a.id].stability - cards[b.id].stability)
    .slice(0, 6);
  // 배운 게 하나도 없으면 새 메뉴를 더 줘요
  const moreFresh = learned.length ? fresh : recipes.filter((r) => isNew(cards[r.id])).slice(0, 3);
  return build(moreFresh, shuffle(weak), cards, recipes);
}

/** 스테이지: 패밀리 하나 */
export function stageRound(familyId: string, recipes: Recipe[]): Round {
  const members = recipes.filter((r) => r.family === familyId);
  const target = Math.min(10, Math.max(6, members.length * 2));
  const qs: Question[] = [];
  const order = shuffle(members);
  for (let i = 0; qs.length < target && i < target * 3; i++) {
    const r = order[i % order.length];
    qs.push(...questionsFor(r, recipes, 1));
  }
  return { items: shuffle(qs).slice(0, target).map((q) => ({ type: 'q', q })), recipeIds: members.map((m) => m.id) };
}

export function starsFor(firstTryRight: number, total: number) {
  const acc = total ? firstTryRight / total : 0;
  return acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
}

/** 메뉴별 결과 → 간격 반복 평가 */
export function gradeFor(wrong: number, answered: number): Grade {
  if (wrong === 0) return Rating.Good;
  if (wrong === 1 && answered >= 2) return Rating.Hard;
  return Rating.Again;
}

/* ───────── 스테이지 지도 ───────── */
export function stageList(recipes: Recipe[], meta: Meta) {
  const fams = FAMILIES.filter((f) => recipes.some((r) => r.family === f.id));
  return fams.map((f, i) => {
    const st = meta.stages[f.id];
    const prev = i === 0 ? null : meta.stages[fams[i - 1].id];
    return {
      family: f,
      count: recipes.filter((r) => r.family === f.id).length,
      stars: st?.stars ?? 0,
      unlocked: i === 0 || (prev?.stars ?? 0) > 0 || (st?.stars ?? 0) > 0
    };
  });
}
