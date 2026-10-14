import type { Recipe } from '../data/recipes';

export const NUM_RE = /\d+\/\d+|\d+(?:\.\d+)?/g;

export const tempLabel = (r: Recipe) => (r.temp === 'HOT' ? '핫' : r.temp === 'ICE' ? '아이스' : '');

export function fullName(r: Recipe): string {
  const bits = [r.temp === 'HOT' ? 'hot' : r.temp === 'ICE' ? 'ice' : '', r.cup ?? ''].filter(Boolean);
  return bits.length ? `${r.name} (${bits.join(' / ')})` : r.name;
}

/** 숫자를 #으로 바꾼 "재료 키" — 핫/아이스 비교에서 같은 재료인지 판단 */
export const lineKey = (line: string) => line.replace(NUM_RE, '#').replace(/\s+/g, ' ').trim();

export function findPair(r: Recipe, all: Recipe[]): Recipe | undefined {
  if (!r.temp) return undefined;
  return all.find((x) => x.id !== r.id && x.name === r.name && x.temp && x.temp !== r.temp);
}

export type LineStatus = 'same' | 'num' | 'only';

export interface CompareRow {
  label: string;
  a: { text: string; status: LineStatus }[];
  b: { text: string; status: LineStatus }[];
}

function statusOf(line: string, other: string[]): LineStatus {
  if (other.includes(line)) return 'same';
  const k = lineKey(line);
  if (other.some((o) => lineKey(o) === k)) return 'num';
  return 'only';
}

/** 두 레시피(주로 핫/아이스)를 칸별로 나란히 비교 */
export function compare(a: Recipe, b: Recipe): CompareRow[] {
  const labels: string[] = [];
  for (const s of [...a.sections, ...b.sections]) if (!labels.includes(s.label)) labels.push(s.label);
  const allA = a.sections.flatMap((s) => s.lines);
  const allB = b.sections.flatMap((s) => s.lines);
  return labels.map((label) => {
    const la = a.sections.find((s) => s.label === label)?.lines ?? [];
    const lb = b.sections.find((s) => s.label === label)?.lines ?? [];
    return {
      label,
      a: la.map((t) => ({ text: t, status: statusOf(t, allB) })),
      b: lb.map((t) => ({ text: t, status: statusOf(t, allA) }))
    };
  });
}

/** 패밀리 안에서 절반 이상의 메뉴가 공유하는 줄 = "뼈대" */
export function familySkeleton(members: Recipe[]): { line: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    const uniq = new Set(m.sections.flatMap((s) => s.lines));
    for (const l of uniq) counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  const min = Math.max(2, Math.ceil(members.length / 2));
  return [...counts.entries()]
    .filter(([, c]) => c >= min)
    .sort((x, y) => y[1] - x[1])
    .map(([line, count]) => ({ line, count }));
}

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
