import { useMemo } from 'react';
import { useStore } from '../store';
import { CATEGORIES } from '../data/recipes';
import { level, LEVEL_NAMES, Rating, State } from '../lib/srs';
import { today } from '../lib/db';
import { fullName } from '../lib/recipe-utils';
import { Bean } from '../components/ui';
import { buildDailyQueue, newLeftToday } from './Session';
import type { Nav } from '../App';

function streak(days: string[]): number {
  const set = new Set(days);
  let n = 0;
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1); // 오늘 아직 안 했으면 어제부터 셈
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function isIOSBrowser() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches;
  return ios && !standalone;
}

export function Home({ nav }: { nav: Nav }) {
  const store = useStore();
  const { recipes, cards, meta, logs } = store;

  const queue = useMemo(() => buildDailyQueue(recipes, cards, newLeftToday(meta)), [recipes, cards, meta]);
  const reviewN = queue.filter((q) => q.step !== 'intro').length;
  const newN = queue.filter((q) => q.step === 'intro').length;
  const mins = Math.max(1, Math.round((reviewN * 25 + newN * 60) / 60));

  const mastered = recipes.filter((r) => level(cards[r.id]) >= 3).length;
  const started = recipes.filter((r) => cards[r.id] && cards[r.id].state !== State.New).length;
  const s = streak(meta.studyDays);

  const confusing = useMemo(() => {
    const since = Date.now() - 30 * 864e5;
    const score = new Map<string, number>();
    for (const l of logs) {
      if (l.ts < since) continue;
      const w = l.rating === Rating.Again ? 1 : l.rating === Rating.Hard ? 0.5 : 0;
      if (w) score.set(l.recipeId, (score.get(l.recipeId) ?? 0) + w);
    }
    return [...score.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, sc]) => ({ r: recipes.find((x) => x.id === id), sc }))
      .filter((x) => x.r);
  }, [logs, recipes]);

  const showInstall = !meta.settings.hideInstallTip && isIOSBrowser();

  return (
    <div className="screen home">
      <div className="home-head">
        <div>
          <div className="eyebrow">팀버 레시피</div>
          <h1 className="hello">오늘도 한 잔씩 ☕</h1>
        </div>
        <div className="streak" title="연속 학습일">
          <span className="streak-n">{s}</span>
          <span className="streak-l">일 연속</span>
        </div>
      </div>

      {showInstall && (
        <div className="note-card install">
          <b>홈 화면에 추가해 주세요</b>
          <p>
            사파리에서 그냥 열면 7일 동안 안 쓸 때 기록이 지워질 수 있어요. 아래 <b>공유 버튼(□↑)</b> →{' '}
            <b>홈 화면에 추가</b>를 누르면 앱처럼 쓰고 기록도 안전해요.
          </p>
          <button className="link" onClick={() => store.updateSettings({ hideInstallTip: true })}>
            이미 했어요 / 닫기
          </button>
        </div>
      )}

      <section className="today-card">
        <div className="today-nums">
          <div>
            <span className="big-n">{reviewN}</span>
            <span className="lbl">복습</span>
          </div>
          <div>
            <span className="big-n">{newN}</span>
            <span className="lbl">새 메뉴</span>
          </div>
          <div>
            <span className="big-n">{queue.length ? mins : 0}</span>
            <span className="lbl">분 예상</span>
          </div>
        </div>
        {queue.length ? (
          <button className="btn primary big full" onClick={() => nav({ name: 'study' })}>
            오늘의 학습 시작
          </button>
        ) : (
          <div className="all-done">
            오늘 할 건 다 했어요 🎉
            <button className="btn ghost" onClick={() => nav({ name: 'practice' })}>
              연습실 가기
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>숙련도 지도</h2>
          <span className="muted">
            외운 메뉴 {mastered} / {recipes.length} · 시작 {started}
          </span>
        </div>
        <div className="bar">
          <div style={{ width: `${(mastered / Math.max(1, recipes.length)) * 100}%` }} />
        </div>
        <div className="map">
          {CATEGORIES.map((c) => {
            const rs = recipes.filter((r) => r.category === c);
            if (!rs.length) return null;
            return (
              <div className="map-row" key={c}>
                <span className="map-cat">{c}</span>
                <span className="map-beans">
                  {rs.map((r) => (
                    <button
                      key={r.id}
                      className="bean-btn"
                      onClick={() => nav({ name: 'recipe', id: r.id })}
                      aria-label={`${fullName(r)} ${LEVEL_NAMES[level(cards[r.id])]}`}
                    >
                      <Bean card={cards[r.id]} title={`${fullName(r)} · ${LEVEL_NAMES[level(cards[r.id])]}`} />
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
        <div className="legend">
          {LEVEL_NAMES.map((n, i) => (
            <span key={n}>
              <svg className={`bean lv${i}`} width="10" height="13" viewBox="0 0 20 26">
                <ellipse cx="10" cy="13" rx="8.5" ry="11.5" className="bean-body" />
              </svg>
              {n}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>헷갈리는 메뉴</h2>
          <span className="muted">최근 30일</span>
        </div>
        {confusing.length ? (
          <ol className="confusing">
            {confusing.map(({ r, sc }) => (
              <li key={r!.id}>
                <button className="row-btn" onClick={() => nav({ name: 'recipe', id: r!.id })}>
                  <span>{fullName(r!)}</span>
                  <span className="muted">틀림 {sc % 1 ? sc.toFixed(1) : sc}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">아직 없어요. 학습을 하면 자주 틀리는 메뉴가 여기 모여요.</p>
        )}
      </section>
    </div>
  );
}
