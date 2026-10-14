import { useState } from 'react';
import { useStore } from '../store';
import { CATEGORIES, FAMILIES } from '../data/recipes';
import { shuffle } from '../lib/recipe-utils';
import { Header } from '../components/ui';
import type { QItem } from './Session';
import type { Nav } from '../App';

type Mode = 'flash' | 'c1' | 'c2' | 'c3';

const MODES: { id: Mode; name: string; desc: string }[] = [
  { id: 'flash', name: '플래시카드', desc: '메뉴 이름만 보고 전체 레시피 떠올리기' },
  { id: 'c1', name: '빈칸 · 쉬움', desc: '숫자 1~2개만 비워요' },
  { id: 'c2', name: '빈칸 · 보통', desc: '숫자 절반 이상 + 보기 문제 1개' },
  { id: 'c3', name: '빈칸 · 어려움', desc: '숫자 전부 + 보기 문제 2개' }
];

export function Practice({ nav }: { nav: Nav }) {
  const { recipes } = useStore();
  const [mode, setMode] = useState<Mode>('c1');
  const [cat, setCat] = useState('전체');
  const [count, setCount] = useState(10);

  const pool = recipes.filter((r) => cat === '전체' || r.category === cat);

  const start = () => {
    const picked = shuffle(pool).slice(0, count);
    const items: QItem[] = picked.map((r) =>
      mode === 'flash' ? { id: r.id, step: 'flash' } : { id: r.id, step: 'cloze', diff: Number(mode[1]) as 1 | 2 | 3 }
    );
    nav({ name: 'practiceRun', items, title: `연습 · ${MODES.find((m) => m.id === mode)!.name}` });
  };

  return (
    <div className="screen">
      <Header title="연습실" />
      <p className="hint">여기서 푸는 건 복습 일정에 영향을 주지 않아요. 마음껏 반복하세요.</p>

      <h2 className="sub">방법</h2>
      <div className="mode-grid">
        {MODES.map((m) => (
          <button key={m.id} className={`mode-card ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)}>
            <b>{m.name}</b>
            <span>{m.desc}</span>
          </button>
        ))}
      </div>

      <h2 className="sub">범위</h2>
      <div className="chips">
        {['전체', ...CATEGORIES].map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <h2 className="sub">개수</h2>
      <div className="seg">
        {[5, 10, 20, 999].map((n) => (
          <button key={n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>
            {n === 999 ? `전부 (${pool.length})` : n}
          </button>
        ))}
      </div>

      <button className="btn primary big full" disabled={!pool.length} onClick={start}>
        연습 시작
      </button>

      <h2 className="sub">패밀리 보기</h2>
      <p className="hint">비슷한 메뉴끼리 묶어서 공통 뼈대와 차이점을 봐요.</p>
      <div className="fam-grid">
        {FAMILIES.filter((f) => recipes.some((r) => r.family === f.id)).map((f) => (
          <button key={f.id} className="fam-chip" onClick={() => nav({ name: 'family', id: f.id })}>
            {f.name}
            <span className="muted">{recipes.filter((r) => r.family === f.id).length}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
