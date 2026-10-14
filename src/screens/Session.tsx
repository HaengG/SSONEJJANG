import { useRef, useState } from 'react';
import { useStore } from '../store';
import { ClozeQuiz, Flashcard, IntroCard, gradeFromCloze } from '../components/Quiz';
import { difficultyForLevel, type Difficulty } from '../lib/cloze';
import { level, Rating, State, type Grade } from '../lib/srs';
import { today } from '../lib/db';
import type { Recipe } from '../data/recipes';
import type { Card } from '../lib/srs';

export type QItem = { id: string; step: 'intro' | 'flash' | 'cloze'; diff?: Difficulty };

/** 숙련도에 따라 모드를 고르는 규칙 (설계서 3장) */
export function testStepFor(card: Card | undefined): QItem['step'] {
  const lv = level(card);
  if (lv <= 1) return 'flash';
  if (lv === 2) return Math.random() < 0.5 ? 'flash' : 'cloze';
  return 'cloze';
}

export function buildDailyQueue(recipes: Recipe[], cards: Record<string, Card>, newLeft: number): QItem[] {
  const now = Date.now();
  const due = recipes
    .filter((r) => cards[r.id] && cards[r.id].state !== State.New && cards[r.id].due.getTime() <= now)
    .sort((a, b) => cards[a.id].due.getTime() - cards[b.id].due.getTime());
  const fresh = recipes.filter((r) => !cards[r.id] || cards[r.id].state === State.New).slice(0, Math.max(0, newLeft));

  const q: QItem[] = due.map((r) => ({ id: r.id, step: testStepFor(cards[r.id]) }));
  // 새 메뉴는 복습 사이사이에 끼워 넣어요 (교차 학습)
  fresh.forEach((r, i) => {
    const pos = Math.min(q.length, i * 3);
    q.splice(pos, 0, { id: r.id, step: 'intro' });
  });
  return q;
}

export function newLeftToday(meta: { introduced: { date: string; count: number }; settings: { newPerDay: number } }) {
  const used = meta.introduced.date === today() ? meta.introduced.count : 0;
  return Math.max(0, meta.settings.newPerDay - used);
}

interface Props {
  initial: QItem[];
  practice?: boolean; // 연습 모드: 기록·일정에 영향 없음
  title: string;
  onExit: () => void;
}

export function Session({ initial, practice, title, onExit }: Props) {
  const store = useStore();
  const [queue, setQueue] = useState<QItem[]>(initial);
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ done: 0, good: 0 });
  const busy = useRef(false);

  const item = queue[idx];
  const recipe = item ? store.recipes.find((r) => r.id === item.id) : undefined;

  const advance = (insert?: QItem, gap = 3) => {
    setQueue((q) => {
      if (!insert) return q;
      const nq = [...q];
      nq.splice(Math.min(nq.length, idx + 1 + gap), 0, insert);
      return nq;
    });
    setIdx((i) => i + 1);
  };

  const handleIntro = async () => {
    if (busy.current || !item) return;
    busy.current = true;
    if (!practice) await store.markIntroduced();
    busy.current = false;
    advance({ id: item.id, step: 'flash' }, 2);
  };

  const handleGrade = async (g: Grade, mode: 'flash' | 'cloze', wrong?: number, total?: number) => {
    if (busy.current || !item) return;
    busy.current = true;
    const ok = g >= Rating.Good || (mode === 'cloze' && g === Rating.Hard);
    setStats((s) => ({ done: s.done + 1, good: s.good + (ok ? 1 : 0) }));
    if (practice) {
      busy.current = false;
      // 연습에서는 틀린 것만 한 번 더
      advance(g === Rating.Again ? { ...item } : undefined, 4);
      return;
    }
    const next = await store.rate(item.id, g, mode, wrong, total);
    busy.current = false;
    // 15분 안에 다시 봐야 하는 카드는 이번 세션 안에서 다시 나와요
    if (next.due.getTime() - Date.now() < 15 * 60 * 1000) {
      advance({ id: item.id, step: mode === 'cloze' && g !== Rating.Again ? 'cloze' : 'flash', diff: 1 }, 3);
    } else advance();
  };

  const progress = Math.min(1, idx / Math.max(1, queue.length));

  if (!item || !recipe) {
    const rate = stats.done ? Math.round((stats.good / stats.done) * 100) : 0;
    return (
      <div className="screen session">
        <div className="done-card">
          <div className="done-doodle" aria-hidden>
            <svg viewBox="0 0 120 120" width="120" height="120">
              <path d="M28 46 h56 l-6 52 a8 8 0 0 1 -8 7 h-28 a8 8 0 0 1 -8 -7 z" className="doodle-fill" />
              <path d="M84 56 c14 0 14 22 -2 22" className="doodle-line" />
              <path d="M44 30 c-6 -8 6 -12 0 -20 M58 30 c-6 -8 6 -12 0 -20 M72 30 c-6 -8 6 -12 0 -20" className="doodle-line" />
            </svg>
          </div>
          <h2>{practice ? '연습 끝!' : '오늘 학습 끝!'}</h2>
          <p>
            {stats.done}번 풀었고, {rate}% 맞혔어요.
          </p>
          {!practice && <p className="hint">틀린 메뉴는 금방 다시 나오고, 잘 아는 메뉴는 점점 뜸하게 나와요.</p>}
          <button className="btn primary big" onClick={onExit}>
            처음으로
          </button>
        </div>
      </div>
    );
  }

  const card = store.cards[recipe.id];
  return (
    <div className="screen session">
      <div className="session-bar">
        <button className="link" onClick={onExit}>
          그만하기
        </button>
        <div className="progress" aria-label={`진행 ${idx}/${queue.length}`}>
          <div style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="count">
          {idx + 1}/{queue.length}
        </span>
      </div>
      <div className="session-title">{title}</div>
      {item.step === 'intro' && <IntroCard key={idx} recipe={recipe} all={store.recipes} onNext={handleIntro} />}
      {item.step === 'flash' && (
        <Flashcard key={idx} recipe={recipe} card={practice ? undefined : card} onRate={(g) => handleGrade(g, 'flash')} />
      )}
      {item.step === 'cloze' && (
        <ClozeQuiz
          key={idx}
          recipe={recipe}
          all={store.recipes}
          difficulty={item.diff ?? difficultyForLevel(level(card))}
          onDone={(w, t) => handleGrade(gradeFromCloze(w, t), 'cloze', w, t)}
        />
      )}
    </div>
  );
}
