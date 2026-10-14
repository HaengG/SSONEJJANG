import type { ReactNode } from 'react';
import type { Recipe } from '../data/recipes';
import { level, LEVEL_NAMES, type Card } from '../lib/srs';
import { NUM_RE, type LineStatus } from '../lib/recipe-utils';

export function TempBadge({ r }: { r: Recipe }) {
  if (!r.temp) return null;
  return <span className={`badge ${r.temp === 'HOT' ? 'hot' : 'ice'}`}>{r.temp === 'HOT' ? 'HOT' : 'ICE'}</span>;
}

export function CupBadge({ r }: { r: Recipe }) {
  if (!r.cup) return null;
  return <span className="badge cup">{r.cup}</span>;
}

export function Bean({ card, size = 14, title }: { card?: Card; size?: number; title?: string }) {
  const lv = level(card);
  return (
    <svg
      className={`bean lv${lv}`}
      width={size}
      height={size * 1.3}
      viewBox="0 0 20 26"
      role="img"
      aria-label={title ?? LEVEL_NAMES[lv]}
    >
      <title>{title ?? LEVEL_NAMES[lv]}</title>
      <ellipse cx="10" cy="13" rx="8.5" ry="11.5" className="bean-body" />
      <path d="M10 2.5 C 6 9, 14 16, 10 23.5" className="bean-crease" />
    </svg>
  );
}

/** 숫자를 강조해서 보여주기 */
export function LineText({ text }: { text: string }) {
  if (text.startsWith('📍')) return <span className="loc">{text.replace('📍', '').trim()}</span>;
  const parts: ReactNode[] = [];
  let pos = 0;
  for (const m of text.matchAll(NUM_RE)) {
    if (m.index! > pos) parts.push(text.slice(pos, m.index));
    parts.push(
      <b key={m.index} className="num">
        {m[0]}
      </b>
    );
    pos = m.index! + m[0].length;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

/** 레시피북의 칸 구조(준비 → 샷 → 우유·물 → 마무리)를 그대로 보여주는 카드 */
export function RecipeView({
  recipe,
  status
}: {
  recipe: Recipe;
  status?: Record<string, LineStatus>; // key: `${label}|${line}`
}) {
  return (
    <div className={`recipe-view ${recipe.kind}`}>
      {recipe.sections.map((s, si) => (
        <div className="rv-row" key={si}>
          <div className="rv-label">{s.label}</div>
          <ol className="rv-lines">
            {s.lines.map((l, li) => {
              const st = status?.[`${s.label}|${l}`];
              return (
                <li key={li} className={st ? `st-${st}` : undefined}>
                  <LineText text={l} />
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {recipe.notes?.length ? (
        <div className="rv-notes">
          {recipe.notes.map((n, i) => (
            <div key={i}>✎ {n}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Header({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 L8 12.3 L15.4 19" />
          </svg>
        </button>
      ) : (
        <span className="icon-btn-spacer" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  );
}
