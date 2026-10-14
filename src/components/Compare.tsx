import type { Recipe } from '../data/recipes';
import { compare } from '../lib/recipe-utils';
import { LineText, TempBadge, CupBadge } from './ui';

/** 핫/아이스 나란히 비교 — 다른 부분만 형광펜 */
export function CompareView({ a, b }: { a: Recipe; b: Recipe }) {
  // 항상 ICE를 왼쪽, HOT을 오른쪽에
  const [left, right] = a.temp === 'HOT' ? [b, a] : [a, b];
  const rows = compare(left, right);
  return (
    <div className="compare">
      <div className="cmp-head">
        <div>
          <TempBadge r={left} /> <CupBadge r={left} />
        </div>
        <div>
          <TempBadge r={right} /> <CupBadge r={right} />
        </div>
      </div>
      {rows.map((row) => (
        <div className="cmp-row" key={row.label}>
          <div className="cmp-label">{row.label}</div>
          <div className="cmp-cols">
            <ul>
              {row.a.length ? row.a.map((l, i) => <li key={i} className={`st-${l.status}`}><LineText text={l.text} /></li>) : <li className="empty">—</li>}
            </ul>
            <ul>
              {row.b.length ? row.b.map((l, i) => <li key={i} className={`st-${l.status}`}><LineText text={l.text} /></li>) : <li className="empty">—</li>}
            </ul>
          </div>
        </div>
      ))}
      <p className="hint">형광펜 = 반대쪽과 다른 부분 · 점선 = 같은 재료인데 양이 다름</p>
    </div>
  );
}
