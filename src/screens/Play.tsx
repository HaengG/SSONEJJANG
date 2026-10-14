import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { FAMILIES } from '../data/recipes';
import type { Question } from '../lib/questions';
import { gradeFor, rankOf, starsFor, xpFor, type PlayItem, type Round } from '../lib/game';
import { fullName } from '../lib/recipe-utils';
import { IntroCard } from '../components/Quiz';
import { LineText, RecipeView } from '../components/ui';

export type PlayMode = 'daily' | 'extra' | 'stage';

interface Props {
  round: Round;
  mode: PlayMode;
  familyId?: string;
  onExit: () => void;
  onMore: () => void;
  onRush: () => void;
}

interface Tally {
  wrong: number;
  answered: number;
}

export function Play({ round, mode, familyId, onExit, onMore, onRush }: Props) {
  const store = useStore();
  const [queue, setQueue] = useState<PlayItem[]>(round.items);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [pop, setPop] = useState<{ n: number; k: number } | null>(null);
  // 점수는 ref로 즉시 반영 (타이머로 넘어갈 때 마지막 정답이 빠지지 않게)
  const stat = useRef({ right: 0, total: 0, xp: 0, maxCombo: 0 });
  const first = stat.current;
  const xp = stat.current.xp;
  const maxCombo = stat.current.maxCombo;
  const tally = useRef(new Map<string, Tally>());
  const [done, setDone] = useState<null | { stars: number; xpBefore: number }>(null);
  const saved = useRef(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const item = queue[idx];
  const totalQ = queue.filter((x) => x.type === 'q').length;
  const doneQ = queue.slice(0, idx).filter((x) => x.type === 'q').length;

  const finalize = async () => {
    if (saved.current) return null;
    saved.current = true;
    const { right, total, xp } = stat.current;
    const stars = starsFor(right, total);
    const xpBefore = store.meta.xp;
    const ratings = [...tally.current.entries()]
      .filter(([, t]) => t.answered > 0)
      .map(([recipeId, t]) => ({ recipeId, grade: gradeFor(t.wrong, t.answered), wrong: t.wrong, total: t.answered }));
    await store.finishGame({
      ratings,
      xp,
      stage: mode === 'stage' && familyId && total > 0 ? { familyId, stars } : undefined
    });
    return { stars, xpBefore };
  };

  const next = () => {
    window.clearTimeout(timer.current);
    setPicked(null);
    if (idx + 1 >= queue.length) {
      finalize().then((r) => r && setDone(r));
    }
    setIdx((i) => i + 1);
  };

  const answer = (q: Question, opt: string, retry?: boolean) => {
    if (picked) return;
    setPicked(opt);
    const ok = opt === q.answer;
    if (!retry) {
      const t = tally.current.get(q.recipeId) ?? { wrong: 0, answered: 0 };
      t.answered++;
      if (!ok) t.wrong++;
      tally.current.set(q.recipeId, t);
      stat.current.total++;
      if (ok) stat.current.right++;
    }
    if (ok) {
      const c = combo + 1;
      const gain = retry ? 3 : xpFor(c - 1);
      setCombo(c);
      stat.current.maxCombo = Math.max(stat.current.maxCombo, c);
      stat.current.xp += gain;
      setPop({ n: gain, k: Date.now() });
      timer.current = window.setTimeout(next, 750);
    } else {
      setCombo(0);
      // 틀린 문제는 판 끝에 한 번 더
      if (!retry) setQueue((qq) => [...qq, { type: 'q', q: { ...q, id: q.id + 'r' }, retry: true }]);
    }
  };

  const quit = async () => {
    window.clearTimeout(timer.current);
    if (stat.current.total > 0) await finalize();
    onExit();
  };

  /* ───────── 결과 화면 ───────── */
  if (done || !item) {
    const res = done ?? { stars: starsFor(first.right, first.total), xpBefore: store.meta.xp - xp };
    const acc = first.total ? Math.round((first.right / first.total) * 100) : 0;
    const before = rankOf(res.xpBefore);
    const after = rankOf(store.meta.xp);
    const wrongIds = [...tally.current.entries()].filter(([, t]) => t.wrong > 0).map(([id]) => id);
    const fam = FAMILIES.find((f) => f.id === familyId);
    return (
      <div className="screen play">
        <div className="result-card">
          <div className="result-kicker">{mode === 'stage' ? `스테이지 · ${fam?.name}` : mode === 'daily' ? '오늘의 주문' : '한 판 더'}</div>
          {mode === 'stage' ? (
            <div className="stars big" aria-label={`별 ${res.stars}개`}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= res.stars ? 'on' : ''} style={{ animationDelay: `${i * 0.15}s` }}>
                  ★
                </span>
              ))}
            </div>
          ) : (
            <div className="result-big">완료!</div>
          )}
          <div className="result-stats">
            <div>
              <b>{acc}%</b>
              <span>한 번에 맞힘</span>
            </div>
            <div>
              <b>{maxCombo}</b>
              <span>최고 콤보</span>
            </div>
            <div>
              <b>+{xp}</b>
              <span>XP</span>
            </div>
          </div>
          {after.index > before.index && <div className="rankup">🎉 {after.name}로 승급했어요!</div>}
          {wrongIds.length > 0 && (
            <div className="wrong-list">
              <div className="muted small">다시 볼 메뉴</div>
              {wrongIds.map((id) => {
                const r = store.recipes.find((x) => x.id === id);
                return r ? <span key={id} className="wrong-chip">{fullName(r)}</span> : null;
              })}
            </div>
          )}
          <div className="btn-col">
            <button className="btn primary big full" onClick={onMore}>
              한 판 더
            </button>
            <div className="btn-row">
              <button className="btn" onClick={onRush}>
                주문 러시 60초
              </button>
              <button className="btn ghost" onClick={onExit}>
                홈으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───────── 진행 화면 ───────── */
  const recipe = store.recipes.find((r) => r.id === (item.type === 'intro' ? item.recipeId : item.q.recipeId));
  return (
    <div className="screen play">
      <div className="session-bar">
        <button className="link" onClick={quit}>
          그만하기
        </button>
        <div className="progress">
          <div style={{ width: `${(doneQ / Math.max(1, totalQ)) * 100}%` }} />
        </div>
        <span className={`combo ${combo >= 2 ? 'on' : ''}`} key={combo}>
          {combo >= 2 ? `🔥${combo}` : `${doneQ}/${totalQ}`}
        </span>
      </div>

      {item.type === 'intro' && recipe && (
        <IntroCard
          key={idx}
          recipe={recipe}
          all={store.recipes}
          onNext={async () => {
            if (mode !== 'stage') await store.markIntroduced();
            next();
          }}
        />
      )}

      {item.type === 'q' && (
        <QuestionCard key={item.q.id + idx} q={item.q} retry={item.retry} picked={picked} onPick={(o) => answer(item.q, o, item.retry)} />
      )}

      {pop && picked && item.type === 'q' && picked === item.q.answer && (
        <div className="xp-pop" key={pop.k}>
          +{pop.n} XP
        </div>
      )}

      {item.type === 'q' && picked && picked !== item.q.answer && recipe && (
        <div className="wrong-box">
          <div className="wrong-title">정답: {item.q.answer}</div>
          <div className="muted small">{item.q.explain}</div>
          <details>
            <summary>{fullName(recipe)} 레시피 보기</summary>
            <RecipeView recipe={recipe} />
          </details>
          <button className="btn primary big full" onClick={next}>
            다음 →
          </button>
          <p className="hint center">이 문제는 판 끝에 한 번 더 나와요</p>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  q,
  retry,
  picked,
  onPick
}: {
  q: Question;
  retry?: boolean;
  picked: string | null;
  onPick: (o: string) => void;
}) {
  const store = useStore();
  const r = store.recipes.find((x) => x.id === q.recipeId);
  const wide = q.options.length === 2 || q.options.some((o) => o.length > 9);
  return (
    <div className={`qcard ${picked ? (picked === q.answer ? 'is-right' : 'is-wrong') : ''}`}>
      {retry && <div className="retry-tag">다시 한 번</div>}
      {q.title && (
        <div className="q-head">
          <span className="q-menu">{q.title}</span>
        </div>
      )}
      {q.showCard && r && (
        <div className="q-cardwrap">
          <RecipeView recipe={r} />
        </div>
      )}
      {q.line && (
        <div className="q-line">
          {q.label && <span className="q-label">{q.label}</span>}
          <span className="q-text">
            <LineText text={q.line} />
          </span>
        </div>
      )}
      <div className="q-ask">{q.ask}</div>
      <div className={`opts ${wide ? 'wide' : ''} ${q.options.length === 2 ? 'two' : ''}`}>
        {q.options.map((o) => {
          const state = picked ? (o === q.answer ? 'right' : o === picked ? 'wrong' : 'dim') : '';
          return (
            <button key={o} className={`opt ${state} ${o === 'ICE' ? 'ice' : o === 'HOT' ? 'hot' : ''}`} onClick={() => onPick(o)} disabled={!!picked}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
