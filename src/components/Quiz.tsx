import { useMemo, useState } from 'react';
import { FAMILIES, type Recipe } from '../data/recipes';
import { buildCloze, normalize, type Difficulty } from '../lib/cloze';
import { findPair, fullName } from '../lib/recipe-utils';
import { intervalLabel, previewDue, Rating, type Card, type Grade } from '../lib/srs';
import { CompareView } from './Compare';
import { CupBadge, LineText, RecipeView, TempBadge } from './ui';

function Title({ r }: { r: Recipe }) {
  const fam = FAMILIES.find((f) => f.id === r.family);
  return (
    <div className="q-title">
      <div className="q-family">
        {r.category} · {fam?.name}
      </div>
      <h2 className="q-name">{r.name}</h2>
      <div className="q-badges">
        <TempBadge r={r} />
        <CupBadge r={r} />
      </div>
    </div>
  );
}

/* ─────────── 새 메뉴 소개 (패밀리 보기 G) ─────────── */
export function IntroCard({ recipe, all, onNext }: { recipe: Recipe; all: Recipe[]; onNext: () => void }) {
  const fam = FAMILIES.find((f) => f.id === recipe.family);
  const pair = findPair(recipe, all);
  return (
    <div className="quiz">
      <div className="sticker new">새 메뉴</div>
      <Title r={recipe} />
      {fam?.tip && <div className="tip">💡 {fam.tip}</div>}
      <RecipeView recipe={recipe} />
      {pair && (
        <>
          <h3 className="sub">{pair.temp === 'HOT' ? '핫' : '아이스'}이랑은 여기가 달라요</h3>
          <CompareView a={recipe} b={pair} />
        </>
      )}
      <div className="q-actions">
        <button className="btn primary big" onClick={onNext}>
          눈에 담았어요 →
        </button>
      </div>
      <p className="hint center">조금 뒤에 다시 물어볼게요</p>
    </div>
  );
}

/* ─────────── A. 플래시카드 ─────────── */
const RATE_BTNS: { g: Grade; label: string; cls: string }[] = [
  { g: Rating.Again, label: '모름', cls: 'again' },
  { g: Rating.Hard, label: '어려움', cls: 'hard' },
  { g: Rating.Good, label: '알맞음', cls: 'good' },
  { g: Rating.Easy, label: '쉬움', cls: 'easy' }
];

export function Flashcard({
  recipe,
  card,
  onRate
}: {
  recipe: Recipe;
  card?: Card;
  onRate: (g: Grade) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const due = useMemo(() => (card ? previewDue(card) : null), [card]);
  return (
    <div className="quiz">
      <Title r={recipe} />
      {!flipped ? (
        <>
          <p className="prompt">레시피를 머릿속으로 끝까지 떠올려 보세요</p>
          <div className="skeleton">
            {recipe.sections.map((s, i) => (
              <div className="sk-row" key={i}>
                <span className="rv-label">{s.label}</span>
                <span className="sk-blank">{'？'.repeat(Math.min(s.lines.length, 6))}</span>
              </div>
            ))}
          </div>
          <div className="q-actions">
            <button className="btn primary big" onClick={() => setFlipped(true)}>
              정답 보기
            </button>
          </div>
        </>
      ) : (
        <>
          <RecipeView recipe={recipe} />
          <p className="prompt small">얼마나 떠올렸나요?</p>
          <div className="rate-grid">
            {RATE_BTNS.map((b) => (
              <button key={b.g} className={`rate ${b.cls}`} onClick={() => onRate(b.g)}>
                <span>{b.label}</span>
                {due && <small>{intervalLabel(due[b.g])} 뒤</small>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────── B. 빈칸 채우기 ─────────── */
export function gradeFromCloze(wrong: number, total: number): Grade {
  if (wrong === 0) return Rating.Good;
  if (wrong / total <= 0.34) return Rating.Hard;
  return Rating.Again;
}

const GRADE_TEXT: Record<number, string> = {
  [Rating.Again]: '다시 볼게요 (곧 다시 나와요)',
  [Rating.Hard]: '거의 맞았어요 (조금 일찍 다시 나와요)',
  [Rating.Good]: '완벽해요!',
  [Rating.Easy]: '완벽해요!'
};

export function ClozeQuiz({
  recipe,
  all,
  difficulty,
  onDone
}: {
  recipe: Recipe;
  all: Recipe[];
  difficulty: Difficulty;
  onDone: (wrong: number, total: number) => void;
}) {
  const cloze = useMemo(() => buildCloze(recipe, difficulty, all), [recipe, difficulty, all]);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  const answers = useMemo(() => {
    const m: Record<number, string> = {};
    for (const s of cloze.sections)
      for (const l of s.lines) {
        if (l.kind === 'choice') m[l.id] = l.answer;
        else for (const g of l.segs) if (g.t === 'num') m[g.id] = g.answer;
      }
    return m;
  }, [cloze]);

  const isRight = (id: number) => normalize(ans[id] ?? '') === normalize(answers[id]);
  const total = cloze.blankCount;
  const wrong = checked ? Object.keys(answers).filter((k) => !isRight(Number(k))).length : 0;

  const inputMode = (a: string) => (/^\d+$/.test(a) ? 'numeric' : /^\d+\.\d+$/.test(a) ? 'decimal' : 'text');

  return (
    <div className="quiz">
      <Title r={recipe} />
      <p className="prompt">빈칸을 채워 보세요 {difficulty === 1 ? '· 쉬움' : difficulty === 2 ? '· 보통' : '· 어려움'}</p>
      <div className="recipe-view cloze">
        {cloze.sections.map((s, si) => (
          <div className="rv-row" key={si}>
            <div className="rv-label">{s.label}</div>
            <ol className="rv-lines">
              {s.lines.map((l, li) =>
                l.kind === 'choice' ? (
                  <li key={li} className="choice-line">
                    <div className="choices">
                      {l.options.map((o) => {
                        const sel = ans[l.id] === o;
                        const cls = checked
                          ? o === l.answer
                            ? 'right'
                            : sel
                              ? 'wrong'
                              : 'dim'
                          : sel
                            ? 'sel'
                            : '';
                        return (
                          <button
                            key={o}
                            className={`choice ${cls}`}
                            disabled={checked}
                            onClick={() => setAns({ ...ans, [l.id]: o })}
                          >
                            <LineText text={o} />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ) : (
                  <li key={li}>
                    {l.segs.map((g, gi) =>
                      g.t === 'text' ? (
                        <LineText key={gi} text={g.v} />
                      ) : (
                        <span key={gi} className="blank-wrap">
                          <input
                            className={`blank ${checked ? (isRight(g.id) ? 'right' : 'wrong') : ''}`}
                            style={{ width: `${Math.max(2.6, g.answer.length * 0.85 + 1.4)}em` }}
                            inputMode={inputMode(g.answer)}
                            value={ans[g.id] ?? ''}
                            disabled={checked}
                            aria-label="빈칸"
                            onChange={(e) => setAns({ ...ans, [g.id]: e.target.value })}
                          />
                          {checked && !isRight(g.id) && <span className="correction">{g.answer}</span>}
                        </span>
                      )
                    )}
                  </li>
                )
              )}
            </ol>
          </div>
        ))}
      </div>
      {!checked ? (
        <div className="q-actions">
          <button className="btn primary big" onClick={() => setChecked(true)}>
            채점하기
          </button>
        </div>
      ) : (
        <div className="result">
          <div className={`result-score ${wrong === 0 ? 'ok' : 'bad'}`}>
            {total - wrong} / {total} 맞음
          </div>
          <div className="result-text">{GRADE_TEXT[gradeFromCloze(wrong, total)]}</div>
          <button className="btn primary big" onClick={() => onDone(wrong, total)}>
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}

export { fullName };
