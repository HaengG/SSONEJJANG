import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { CATEGORIES, FAMILIES, type Recipe, type Section } from '../data/recipes';
import { familySkeleton, findPair, fullName } from '../lib/recipe-utils';
import { level, LEVEL_NAMES } from '../lib/srs';
import { Bean, CupBadge, Header, LineText, RecipeView, TempBadge } from '../components/ui';
import { CompareView } from '../components/Compare';
import type { Nav } from '../App';

/* ─────────── 레시피북 목록 ─────────── */
export function BookList({ nav }: { nav: Nav }) {
  const { recipes, cards } = useStore();
  const [cat, setCat] = useState<string>('전체');
  const [q, setQ] = useState('');

  const filtered = recipes.filter(
    (r) => (cat === '전체' || r.category === cat) && (!q.trim() || fullName(r).includes(q.trim()))
  );
  const families = [...new Set(filtered.map((r) => r.family))];

  return (
    <div className="screen">
      <Header
        title="레시피북"
        right={
          <button className="btn small" onClick={() => nav({ name: 'edit' })}>
            + 추가
          </button>
        }
      />
      <input className="search" placeholder="메뉴 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {['전체', ...CATEGORIES].map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      {families.map((fid) => {
        const fam = FAMILIES.find((f) => f.id === fid);
        const rs = filtered.filter((r) => r.family === fid);
        return (
          <section className="fam-group" key={fid}>
            <div className="fam-head">
              <h2>{fam?.name ?? '기타'}</h2>
              <button className="link" onClick={() => nav({ name: 'family', id: fid })}>
                패밀리 보기 →
              </button>
            </div>
            <ul className="list">
              {rs.map((r) => (
                <li key={r.id}>
                  <button className="row-btn" onClick={() => nav({ name: 'recipe', id: r.id })}>
                    <span className="row-main">
                      <Bean card={cards[r.id]} />
                      <span>{r.name}</span>
                      <TempBadge r={r} />
                      <CupBadge r={r} />
                    </span>
                    <span className="chev">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!filtered.length && <p className="muted center">찾는 메뉴가 없어요.</p>}
    </div>
  );
}

/* ─────────── 레시피 상세 ─────────── */
export function RecipeDetail({ id, nav, back }: { id: string; nav: Nav; back: () => void }) {
  const { recipes, cards } = useStore();
  const r = recipes.find((x) => x.id === id);
  if (!r) return <div className="screen"><Header title="없는 메뉴" onBack={back} /></div>;
  const pair = findPair(r, recipes);
  const fam = FAMILIES.find((f) => f.id === r.family);
  const lv = level(cards[r.id]);
  return (
    <div className="screen">
      <Header
        title={r.name}
        onBack={back}
        right={
          <button className="btn small" onClick={() => nav({ name: 'edit', id: r.id })}>
            수정
          </button>
        }
      />
      <div className="detail-meta">
        <TempBadge r={r} />
        <CupBadge r={r} />
        <span className="badge plain">
          <Bean card={cards[r.id]} size={10} /> {LEVEL_NAMES[lv]}
        </span>
      </div>
      <RecipeView recipe={r} />
      <div className="btn-row">
        <button className="btn" onClick={() => nav({ name: 'practiceOne', id: r.id })}>
          이 메뉴 빈칸 연습
        </button>
        <button className="btn ghost" onClick={() => nav({ name: 'family', id: r.family })}>
          {fam?.name ?? '패밀리'} 보기
        </button>
      </div>
      {pair && (
        <section className="panel">
          <h2 className="sub">핫 / 아이스 비교</h2>
          <CompareView a={r} b={pair} />
        </section>
      )}
    </div>
  );
}

/* ─────────── G. 패밀리 보기 ─────────── */
export function FamilyView({ id, nav, back }: { id: string; nav: Nav; back: () => void }) {
  const { recipes, cards } = useStore();
  const fam = FAMILIES.find((f) => f.id === id);
  const members = useMemo(() => recipes.filter((r) => r.family === id), [recipes, id]);
  // 핫/아이스가 섞인 패밀리는 온도별로 뼈대를 따로 잡아요 (만드는 흐름 자체가 달라서)
  const groups = useMemo(() => {
    const ice = members.filter((m) => m.temp === 'ICE');
    const hot = members.filter((m) => m.temp === 'HOT');
    const gs =
      ice.length >= 2 && hot.length >= 2
        ? [
            { key: 'ICE', label: '아이스 공통 뼈대', ms: ice },
            { key: 'HOT', label: '핫 공통 뼈대', ms: hot }
          ]
        : [{ key: 'ALL', label: '공통 뼈대', ms: members }];
    return gs.map((g) => ({ ...g, skeleton: familySkeleton(g.ms) })).filter((g) => g.skeleton.length);
  }, [members]);
  const skelFor = (r: Recipe) => {
    const g = groups.find((x) => x.key === r.temp) ?? groups.find((x) => x.key === 'ALL');
    return new Set((g ? [g] : groups).flatMap((x) => x.skeleton.map((s) => s.line)));
  };

  return (
    <div className="screen">
      <Header title={fam?.name ?? '패밀리'} onBack={back} />
      {fam?.tip && <div className="tip">💡 {fam.tip}</div>}
      {groups.length > 0 && (
        <section className="panel skeleton-panel">
          <p className="hint">비슷한 메뉴 절반 이상에 들어가는 것들이에요. 뼈대부터 외우고, 메뉴마다 다른 점(형광펜)만 기억하면 돼요.</p>
          {groups.map((g) => (
            <div key={g.key} className="skel-group">
              <h2 className="sub">{g.label}</h2>
              <ul className="skel-list">
                {g.skeleton.map((s) => (
                  <li key={s.line}>
                    <LineText text={s.line} /> <span className="muted">×{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      <h2 className="sub">메뉴별 포인트 <span className="muted small">(형광펜 = 이 메뉴만의 차이)</span></h2>
      {members.map((r) => {
        const skelSet = skelFor(r);
        const status: Record<string, 'only' | 'same'> = {};
        for (const s of r.sections) for (const l of s.lines) status[`${s.label}|${l}`] = skelSet.has(l) ? 'same' : 'only';
        return (
          <section className="fam-member" key={r.id}>
            <button className="fam-member-head" onClick={() => nav({ name: 'recipe', id: r.id })}>
              <Bean card={cards[r.id]} />
              <span>{r.name}</span>
              <TempBadge r={r} />
              <CupBadge r={r} />
              <span className="chev">›</span>
            </button>
            <RecipeView recipe={r} status={status} />
          </section>
        );
      })}
    </div>
  );
}

/* ─────────── 수정 / 추가 폼 ─────────── */
interface Draft {
  name: string;
  temp: '' | 'HOT' | 'ICE';
  cup: string;
  category: string;
  family: string;
  kind: 'drink' | 'procedure';
  sections: { label: string; text: string }[];
  notes: string;
}

const toDraft = (r?: Recipe): Draft =>
  r
    ? {
        name: r.name,
        temp: r.temp ?? '',
        cup: r.cup ?? '',
        category: r.category,
        family: r.family,
        kind: r.kind,
        sections: r.sections.map((s) => ({ label: s.label, text: s.lines.join('\n') })),
        notes: (r.notes ?? []).join('\n')
      }
    : {
        name: '',
        temp: '',
        cup: '',
        category: CATEGORIES[0],
        family: FAMILIES[0].id,
        kind: 'drink',
        sections: [
          { label: '준비', text: '' },
          { label: '샷', text: '' },
          { label: '우유·물', text: '' },
          { label: '마무리', text: '' }
        ],
        notes: ''
      };

export function RecipeEdit({ id, back, done }: { id?: string; back: () => void; done: (id?: string) => void }) {
  const { recipes, saveRecipe, removeRecipe } = useStore();
  const orig = id ? recipes.find((r) => r.id === id) : undefined;
  const [d, setD] = useState<Draft>(() => toDraft(orig));
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });
  const setSec = (i: number, patch: Partial<Draft['sections'][number]>) =>
    set('sections', d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const save = async () => {
    const sections: Section[] = d.sections
      .map((s) => ({ label: s.label.trim(), lines: s.text.split('\n').map((l) => l.trim()).filter(Boolean) }))
      .filter((s) => s.label && s.lines.length);
    if (!d.name.trim()) return setErr('메뉴 이름을 적어 주세요.');
    if (!sections.length) return setErr('최소 한 칸은 채워 주세요.');
    const r: Recipe = {
      id: orig?.id ?? `custom-${Date.now()}`,
      name: d.name.trim(),
      ...(d.temp ? { temp: d.temp } : {}),
      ...(d.cup.trim() ? { cup: d.cup.trim() } : {}),
      category: d.category,
      family: d.family,
      kind: d.kind,
      sections,
      ...(d.notes.trim() ? { notes: d.notes.split('\n').map((n) => n.trim()).filter(Boolean) } : {})
    };
    await saveRecipe(r, !orig);
    done(r.id);
  };

  return (
    <div className="screen edit">
      <Header title={orig ? '레시피 수정' : '새 레시피'} onBack={back} />
      <label className="field">
        <span>메뉴 이름</span>
        <input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 바닐라라떼" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>온도</span>
          <select value={d.temp} onChange={(e) => set('temp', e.target.value as Draft['temp'])}>
            <option value="">없음</option>
            <option value="ICE">ICE</option>
            <option value="HOT">HOT</option>
          </select>
        </label>
        <label className="field">
          <span>잔</span>
          <input value={d.cup} onChange={(e) => set('cup', e.target.value)} placeholder="예: 라떼잔" />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>카테고리</span>
          <select value={d.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>패밀리</span>
          <select value={d.family} onChange={(e) => set('family', e.target.value)}>
            {FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>종류</span>
        <select value={d.kind} onChange={(e) => set('kind', e.target.value as Draft['kind'])}>
          <option value="drink">음료 (칸별 재료)</option>
          <option value="procedure">순서 (단계별 절차)</option>
        </select>
      </label>

      <h2 className="sub">칸 <span className="muted small">한 줄에 하나씩 · 위치는 "📍 샷잔"처럼</span></h2>
      {d.sections.map((s, i) => (
        <div className="sec-edit" key={i}>
          <div className="sec-edit-head">
            <input className="sec-label" value={s.label} onChange={(e) => setSec(i, { label: e.target.value })} aria-label="칸 이름" />
            <button className="link danger" onClick={() => set('sections', d.sections.filter((_, j) => j !== i))}>
              칸 삭제
            </button>
          </div>
          <textarea rows={Math.max(2, s.text.split('\n').length + 1)} value={s.text} onChange={(e) => setSec(i, { text: e.target.value })} />
        </div>
      ))}
      <button className="btn ghost full" onClick={() => set('sections', [...d.sections, { label: '새 칸', text: '' }])}>
        + 칸 추가
      </button>

      <label className="field">
        <span>메모 (선택)</span>
        <textarea rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>

      {err && <p className="error">{err}</p>}
      <button className="btn primary big full" onClick={save}>
        저장
      </button>
      {orig && (
        <button
          className={`btn full ${confirmDel ? 'danger-solid' : 'danger'}`}
          onClick={async () => {
            if (!confirmDel) return setConfirmDel(true);
            await removeRecipe(orig.id);
            done(undefined);
          }}
        >
          {confirmDel ? '정말 삭제할까요? 한 번 더 누르면 삭제돼요' : '이 메뉴 삭제'}
        </button>
      )}
    </div>
  );
}
