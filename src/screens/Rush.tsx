import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { oxFor, type Question } from '../lib/questions';
import { State } from '../lib/srs';
import { LineText } from '../components/ui';

const DURATION = 60;

/** 주문 러시: 60초 동안 O/X 최대한 많이 (기록·복습 일정에는 영향 없음, XP만) */
export function Rush({ onExit }: { onExit: () => void }) {
  const store = useStore();
  const [phase, setPhase] = useState<'ready' | 'play' | 'end'>('ready');
  const [left, setLeft] = useState(DURATION);
  const [q, setQ] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<'' | 'right' | 'wrong'>('');
  const [best, setBest] = useState(store.meta.rushBest);
  const scoreRef = useRef(0);
  const prevBest = useRef(store.meta.rushBest);
  const lock = useRef(false);

  // 배운 메뉴가 8개 이상이면 배운 것 위주, 아니면 전체에서
  const learned = store.recipes.filter((r) => store.cards[r.id] && store.cards[r.id].state !== State.New);
  const pool = learned.length >= 8 ? learned : store.recipes;

  const nextQ = () => {
    for (let i = 0; i < 10; i++) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      const nq = oxFor(r, store.recipes);
      if (nq) return setQ(nq);
    }
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const t = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'play' && left <= 0) {
      setPhase('end');
      const s = scoreRef.current;
      setBest(Math.max(store.meta.rushBest, s));
      store.finishGame({ ratings: [], xp: s * 3, rushScore: s });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  const start = () => {
    scoreRef.current = 0;
    prevBest.current = Math.max(prevBest.current, best);
    setScore(0);
    setCombo(0);
    setLeft(DURATION);
    nextQ();
    setPhase('play');
  };

  const pick = (o: string) => {
    if (!q || lock.current || phase !== 'play') return;
    lock.current = true;
    const ok = o === q.answer;
    setFlash(ok ? 'right' : 'wrong');
    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setCombo((c) => c + 1);
    } else setCombo(0);
    window.setTimeout(
      () => {
        setFlash('');
        lock.current = false;
        nextQ();
      },
      ok ? 250 : 900
    );
  };

  if (phase === 'ready' || phase === 'end') {
    const newBest = phase === 'end' && score > prevBest.current;
    return (
      <div className="screen play">
        <div className="result-card">
          <div className="result-kicker">주문 러시</div>
          {phase === 'ready' ? (
            <>
              <div className="result-big">60초</div>
              <p className="center">레시피 문장이 맞으면 <b>O</b>, 틀리면 <b>X</b>.<br />최대한 많이 맞혀 보세요!</p>
              <p className="muted center small">최고 기록 {store.meta.rushBest}개 · 복습 일정에는 영향 없어요</p>
            </>
          ) : (
            <>
              <div className="result-big">{score}개</div>
              {newBest && <div className="rankup">🏆 최고 기록!</div>}
              <p className="muted center small">최고 기록 {Math.max(best, score)}개 · +{score * 3} XP</p>
            </>
          )}
          <div className="btn-col">
            <button className="btn primary big full" onClick={start}>
              {phase === 'ready' ? '시작' : '다시 도전'}
            </button>
            <button className="btn ghost full" onClick={onExit}>
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen play">
      <div className="session-bar">
        <button className="link" onClick={() => setLeft(0)}>
          끝내기
        </button>
        <div className={`progress timer ${left <= 10 ? 'hurry' : ''}`}>
          <div style={{ width: `${(left / DURATION) * 100}%` }} />
        </div>
        <span className="combo on">{left}초</span>
      </div>
      <div className="rush-score">
        <b>{score}</b> {combo >= 3 && <span className="combo-tag">🔥{combo}</span>}
      </div>
      {q && (
        <div className={`qcard rush ${flash ? `is-${flash}` : ''}`}>
          <div className="q-head">
            <span className="q-menu">{q.title}</span>
          </div>
          <div className="q-line">
            {q.label && <span className="q-label">{q.label}</span>}
            <span className="q-text">
              <LineText text={q.line ?? ''} />
            </span>
          </div>
          {flash === 'wrong' && <div className="rush-fix">정답 → {q.explain}</div>}
          <div className="opts two">
            <button className="opt ox o" onClick={() => pick('O')}>
              O
            </button>
            <button className="opt ox x" onClick={() => pick('X')}>
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
