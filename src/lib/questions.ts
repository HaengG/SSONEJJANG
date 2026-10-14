// 탭 한 번으로 푸는 "사실 하나짜리" 문제 생성기
import type { Recipe } from '../data/recipes';
import { compare, findPair, fullName, shuffle } from './recipe-utils';

export type QKind = 'num' | 'temp' | 'loc' | 'name' | 'ox' | 'next';

export interface Question {
  id: string;
  kind: QKind;
  recipeId: string;
  title: string; // 메뉴 이름 (온도/잔 포함)
  label?: string; // 칸 이름 (준비, 샷 …)
  ask: string; // 질문 문장
  line?: string; // 보여줄 줄 (빈칸은 ＿＿)
  showCard?: boolean; // 메뉴 맞히기: 레시피 카드를 보여줌
  options: string[];
  answer: string;
  explain: string; // 틀렸을 때 보여줄 정답 설명
}

// 범위(130~180)·분수(1/2)·소수(1.5)·정수
const TOK = /\d+(?:\.\d+)?\s*~\s*\d+(?:\.\d+)?|\d+\/\d+|\d+(?:\.\d+)?/g;
const SUFFIX = /^[a-zA-Z가-힣]{0,2}/;
const keyOf = (line: string) => line.replace(TOK, '#').replace(/\s+/g, ' ').trim();
const LOC = '📍';
const plain = (l: string) => (l.startsWith(LOC) ? l.replace(LOC, '').trim() : l);

interface Tok {
  value: string;
  start: number;
  end: number;
  suffix: string;
  index: number;
}

function tokens(line: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  for (const m of line.matchAll(TOK)) {
    const start = m.index!;
    const end = start + m[0].length;
    const suffix = line.slice(end).match(SUFFIX)?.[0] ?? '';
    out.push({ value: m[0].replace(/\s+/g, ''), start, end, suffix, index: i++ });
  }
  return out;
}

const askable = (line: string) => !/\/N|n개|N개/.test(line) && !line.startsWith(LOC);

function perturb(v: string, rnd: () => number): string[] {
  if (v.includes('/')) return shuffle(['1/2', '1/3', '2/3', '1/4', '3/4'].filter((x) => x !== v), rnd);
  if (v.includes('~')) {
    const [a, b] = v.split('~').map(Number);
    const st = a >= 100 ? 20 : a >= 20 ? 10 : 1;
    return [`${a - st}~${b - st}`, `${a + st}~${b + st}`, `${a}~${b + st * 2}`, `${a - st}~${b}`].filter(
      (x) => !x.includes('-') && x !== v
    );
  }
  const n = Number(v);
  const dec = v.includes('.');
  const step = dec ? 0.5 : n <= 5 ? 1 : n <= 20 ? (n % 5 === 0 ? 5 : 2) : n <= 100 ? 10 : n <= 300 ? 20 : 50;
  const c = [n - step, n + step, n + step * 2, n - step * 2].filter((x) => x > 0).map((x) => (dec ? x.toFixed(1).replace(/\.0$/, '') : String(x)));
  return shuffle(c, rnd).filter((x) => x !== v);
}

/** 같은 재료 줄의 다른 메뉴 숫자(특히 핫/아이스 짝) → 가장 그럴듯한 함정 */
function sameKeyValues(r: Recipe, line: string, idx: number, all: Recipe[]): string[] {
  const key = keyOf(line);
  const pair = findPair(r, all);
  const pool = [pair, ...all.filter((x) => x.family === r.family), ...all].filter(Boolean) as Recipe[];
  const out: string[] = [];
  for (const x of pool) {
    if (x.id === r.id) continue;
    for (const l of x.sections.flatMap((s) => s.lines)) {
      if (keyOf(l) !== key) continue;
      const t = tokens(l)[idx];
      if (t && !out.includes(t.value)) out.push(t.value);
    }
  }
  return out;
}

function numOptions(r: Recipe, line: string, t: Tok, all: Recipe[], rnd: () => number): string[] {
  const opts = [t.value];
  for (const v of sameKeyValues(r, line, t.index, all).slice(0, 2)) if (!opts.includes(v)) opts.push(v);
  for (const v of perturb(t.value, rnd)) {
    if (opts.length >= 4) break;
    if (!opts.includes(v)) opts.push(v);
  }
  return shuffle(opts, rnd).map((v) => v + t.suffix);
}

let seq = 0;
const qid = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

type Gen = (r: Recipe, all: Recipe[], rnd: () => number) => Question | null;

const linesOf = (r: Recipe) => r.sections.flatMap((s) => s.lines.map((line) => ({ label: s.label, line })));

const genNum: Gen = (r, all, rnd) => {
  const cands = linesOf(r).filter((x) => askable(x.line) && tokens(x.line).length);
  if (!cands.length) return null;
  const { label, line } = cands[Math.floor(rnd() * cands.length)];
  const toks = tokens(line);
  const t = toks[Math.floor(rnd() * toks.length)];
  const shown = line.slice(0, t.start) + '＿＿' + line.slice(t.end + t.suffix.length);
  return {
    id: qid(), kind: 'num', recipeId: r.id, title: fullName(r), label,
    ask: '빈칸에 들어갈 건?', line: shown,
    options: numOptions(r, line, t, all, rnd), answer: t.value + t.suffix,
    explain: line
  };
};

const genTemp: Gen = (r, all, rnd) => {
  const pair = findPair(r, all);
  if (!pair || !r.temp) return null;
  const rows = compare(r, pair);
  const cands = rows.flatMap((row) => row.a.filter((l) => l.status !== 'same').map((l) => ({ label: row.label, line: l.text })));
  if (!cands.length) return null;
  const { label, line } = cands[Math.floor(rnd() * cands.length)];
  return {
    id: qid(), kind: 'temp', recipeId: r.id, title: r.name, label,
    ask: '이건 아이스? 핫?', line: plain(line),
    options: ['ICE', 'HOT'], answer: r.temp,
    explain: `${fullName(r)}의 "${plain(line)}"`
  };
};

const genLoc: Gen = (r, all) => {
  for (const s of r.sections) {
    const i = s.lines.findIndex((l) => l.startsWith(LOC));
    if (i < 0) continue;
    const allLocs = [...new Set(all.flatMap(linesOf).map((x) => x.line).filter((l) => l.startsWith(LOC)).map(plain))];
    const ans = plain(s.lines[i]);
    const what = s.lines[i + 1] ?? s.label;
    return {
      id: qid(), kind: 'loc', recipeId: r.id, title: fullName(r), label: s.label,
      ask: '어디에 담아요?', line: what,
      options: allLocs, answer: ans,
      explain: `${fullName(r)}: ${ans}에 ${what}`
    };
  }
  return null;
};

const genName: Gen = (r, all, rnd) => {
  const pair = findPair(r, all);
  const pool = [
    ...(pair ? [pair] : []),
    ...shuffle(all.filter((x) => x.family === r.family && x.id !== r.id && x.id !== pair?.id), rnd),
    ...shuffle(all.filter((x) => x.category === r.category && x.family !== r.family), rnd)
  ];
  const set = (x: Recipe) => new Set(linesOf(x).map((l) => l.line));
  const mine = set(r);
  const distinct = (x: Recipe) => {
    const o = set(x);
    const aInB = [...mine].every((l) => o.has(l));
    const bInA = [...o].every((l) => mine.has(l));
    return !aInB && !bInA;
  };
  const names = [fullName(r)];
  for (const x of pool) {
    if (names.length >= 4) break;
    if (!distinct(x)) continue;
    const n = fullName(x);
    if (!names.includes(n)) names.push(n);
  }
  if (names.length < 2) return null;
  return {
    id: qid(), kind: 'name', recipeId: r.id, title: '', ask: '이 레시피는 어떤 메뉴?', showCard: true,
    options: shuffle(names, rnd), answer: fullName(r), explain: fullName(r)
  };
};

const genOX: Gen = (r, all, rnd) => {
  const cands = linesOf(r).filter((x) => askable(x.line) || x.line.startsWith(LOC));
  if (!cands.length) return null;
  const { label, line } = cands[Math.floor(rnd() * cands.length)];
  let shown = line;
  if (rnd() < 0.5) {
    // 틀린 문장 만들기: 숫자 바꾸기 → 안 되면 비슷한 메뉴의 같은 칸 줄로 바꾸기
    const toks = tokens(line);
    if (toks.length && askable(line)) {
      const t = toks[Math.floor(rnd() * toks.length)];
      const wrong = numOptions(r, line, t, all, rnd).find((o) => o !== t.value + t.suffix);
      if (wrong) shown = line.slice(0, t.start) + wrong + line.slice(t.end + t.suffix.length);
    } else {
      const own = new Set(linesOf(r).map((x) => x.line));
      const swap = shuffle(
        all.filter((x) => x.family === r.family && x.id !== r.id).flatMap((x) => x.sections.filter((s) => s.label === label).flatMap((s) => s.lines)),
        rnd
      ).find((l) => !own.has(l));
      if (swap) shown = swap;
    }
  }
  const isTrue = shown === line;
  return {
    id: qid(), kind: 'ox', recipeId: r.id, title: fullName(r), label,
    ask: '맞으면 O, 틀리면 X', line: plain(shown),
    options: ['O', 'X'], answer: isTrue ? 'O' : 'X',
    explain: `${label}: ${plain(line)}`
  };
};

const genNext: Gen = (r, _all, rnd) => {
  if (r.kind !== 'procedure') return null;
  const secs = r.sections.filter((s) => s.lines.length >= 3);
  if (!secs.length) return null;
  const s = secs[Math.floor(rnd() * secs.length)];
  const i = Math.floor(rnd() * (s.lines.length - 1));
  const ans = s.lines[i + 1];
  const ctx = s.lines.slice(Math.max(0, i - 1), i + 1).join(' → ');
  const others = shuffle([...new Set(s.lines.filter((l, j) => j !== i + 1 && l !== ans && l !== s.lines[i]))], rnd).slice(0, 3);
  if (!others.length) return null;
  return {
    id: qid(), kind: 'next', recipeId: r.id, title: r.name, label: s.label,
    ask: '다음 단계는?', line: `${ctx} → ？`,
    options: shuffle([ans, ...others], rnd), answer: ans,
    explain: `${ctx} → ${ans}`
  };
};

const WEIGHTS: [Gen, number][] = [
  [genNum, 3],
  [genOX, 2],
  [genTemp, 2],
  [genLoc, 1],
  [genName, 1],
  [genNext, 3]
];

/** 한 메뉴에서 문제 n개 (가능하면 서로 다른 유형·줄) */
export function questionsFor(r: Recipe, all: Recipe[], n: number, rnd = Math.random): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < n && tries < n * 12; tries++) {
    const total = WEIGHTS.reduce((a, [, w]) => a + w, 0);
    let pick = rnd() * total;
    const gen = WEIGHTS.find(([, w]) => (pick -= w) < 0)![0];
    const q = gen(r, all, rnd);
    if (!q) continue;
    const sig = `${q.kind}|${q.line ?? ''}|${q.answer}`;
    if (seen.has(sig)) continue;
    // 같은 유형이 연달아 나오지 않게
    if (out.length && out[out.length - 1].kind === q.kind && tries < n * 6) continue;
    seen.add(sig);
    out.push(q);
  }
  return out;
}

/** 주문 러시용: 빠르게 푸는 O/X만 */
export function oxFor(r: Recipe, all: Recipe[], rnd = Math.random): Question | null {
  for (let i = 0; i < 5; i++) {
    const q = genOX(r, all, rnd);
    if (q) return q;
  }
  return null;
}
