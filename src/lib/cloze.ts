import type { Recipe } from '../data/recipes';
import { NUM_RE, shuffle } from './recipe-utils';

export type Seg = { t: 'text'; v: string } | { t: 'num'; id: number; answer: string };
export type ClozeLine =
  | { kind: 'text'; segs: Seg[] }
  | { kind: 'choice'; id: number; answer: string; options: string[] };
export interface ClozeSection {
  label: string;
  lines: ClozeLine[];
}
export interface Cloze {
  sections: ClozeSection[];
  blankCount: number;
}

/** 1 = 쉬움(숫자 1~2개), 2 = 보통(숫자 60% + 보기 1개), 3 = 어려움(숫자 전부 + 보기 2개) */
export type Difficulty = 1 | 2 | 3;

export function difficultyForLevel(level: number): Difficulty {
  if (level <= 2) return 1;
  if (level === 3) return 2;
  return 3;
}

interface NumTok {
  si: number;
  li: number;
  start: number;
  end: number;
  value: string;
}

function numTokens(r: Recipe): NumTok[] {
  const out: NumTok[] = [];
  r.sections.forEach((s, si) =>
    s.lines.forEach((line, li) => {
      for (const m of line.matchAll(NUM_RE)) {
        out.push({ si, li, start: m.index!, end: m.index! + m[0].length, value: m[0] });
      }
    })
  );
  return out;
}

function distractors(r: Recipe, si: number, answer: string, all: Recipe[], rnd: () => number): string[] {
  const label = r.sections[si].label;
  const own = new Set(r.sections.flatMap((s) => s.lines));
  const others = all.filter((x) => x.id !== r.id);
  const sameLabel = (x: Recipe) => x.sections.filter((s) => s.label === label).flatMap((s) => s.lines);
  const anyLine = (x: Recipe) => x.sections.flatMap((s) => s.lines);
  const notOwn = (ls: string[]) => ls.filter((l) => !own.has(l));
  const tiers: string[][] = [];
  // 위치(📍) 문제는 다른 위치들끼리만 비교해요: 샷잔 vs 바로 잔 vs 긴잔
  if (answer.startsWith('📍')) tiers.push(all.flatMap(anyLine).filter((l) => l.startsWith('📍')));
  // 순서형은 같은 레시피의 다른 단계가 가장 좋은 함정이에요 ("몇 번째 단계였지?")
  if (r.kind === 'procedure') tiers.push(r.sections[si].lines);
  tiers.push(notOwn(others.filter((x) => x.family === r.family).flatMap(sameLabel)));
  tiers.push(notOwn(others.filter((x) => x.category === r.category).flatMap(sameLabel)));
  tiers.push(notOwn(others.flatMap(sameLabel)));
  tiers.push(notOwn(others.filter((x) => x.family === r.family).flatMap(anyLine)));
  tiers.push(notOwn(others.flatMap(anyLine)));
  const picked: string[] = [];
  for (const tier of tiers) {
    for (const l of shuffle([...new Set(tier)], rnd)) {
      if (picked.length >= 3) break;
      if (l !== answer && !picked.includes(l)) picked.push(l);
    }
    if (picked.length >= 3) break;
  }
  return picked;
}

export function buildCloze(r: Recipe, diff: Difficulty, all: Recipe[], rnd = Math.random): Cloze {
  const nums = numTokens(r);
  const lines: { si: number; li: number; text: string }[] = [];
  r.sections.forEach((s, si) => s.lines.forEach((text, li) => lines.push({ si, li, text })));

  let numCount: number;
  let lineCount: number;
  if (diff === 1) {
    numCount = Math.min(2, nums.length);
    lineCount = nums.length === 0 ? 1 : 0;
  } else if (diff === 2) {
    numCount = Math.ceil(nums.length * 0.6);
    lineCount = 1;
  } else {
    numCount = nums.length;
    lineCount = 2;
  }

  const chosenNums = shuffle(nums, rnd).slice(0, numCount);
  const numLineKeys = new Set(chosenNums.map((n) => `${n.si}:${n.li}`));
  // 숫자 빈칸이 없는 줄 중에서 보기 문제를 골라요 (숫자 없는 줄 우선)
  const lineCandidates = shuffle(
    lines.filter((l) => !numLineKeys.has(`${l.si}:${l.li}`)),
    rnd
  ).sort((a, b) => Number(/\d/.test(a.text)) - Number(/\d/.test(b.text)));
  const chosenLines = lineCandidates.slice(0, Math.min(lineCount, Math.max(0, lineCandidates.length)));
  const chosenLineKeys = new Set(chosenLines.map((l) => `${l.si}:${l.li}`));

  let id = 0;
  const sections: ClozeSection[] = r.sections.map((s, si) => ({
    label: s.label,
    lines: s.lines.map((text, li): ClozeLine => {
      const key = `${si}:${li}`;
      if (chosenLineKeys.has(key)) {
        const opts = shuffle([text, ...distractors(r, si, text, all, rnd)], rnd);
        return { kind: 'choice', id: id++, answer: text, options: opts };
      }
      const toks = chosenNums.filter((n) => n.si === si && n.li === li).sort((a, b) => a.start - b.start);
      const segs: Seg[] = [];
      let pos = 0;
      for (const t of toks) {
        if (t.start > pos) segs.push({ t: 'text', v: text.slice(pos, t.start) });
        segs.push({ t: 'num', id: id++, answer: t.value });
        pos = t.end;
      }
      if (pos < text.length) segs.push({ t: 'text', v: text.slice(pos) });
      return { kind: 'text', segs };
    })
  }));
  return { sections, blankCount: id };
}

export const normalize = (s: string) =>
  s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .trim();
