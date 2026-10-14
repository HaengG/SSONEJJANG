import { useMemo } from 'react';
import { useStore } from '../store';
import { CATEGORIES } from '../data/recipes';
import { level, LEVEL_NAMES, Rating, State } from '../lib/srs';
import { today } from '../lib/db';
import { fullName } from '../lib/recipe-utils';
import { Bean } from '../components/ui';
import { newLeftToday } from './Session';
import { rankOf, stageList } from '../lib/game';
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

  const now = Date.now();
  const reviewN = recipes.filter((r) => cards[r.id] && cards[r.id].state !== State.New && cards[r.id].due.getTime() <= now).length;
  const newN = Math.min(newLeftToday(meta), recipes.filter((r) => !cards[r.id] || cards[r.id].state === State.New).length);
  const dailyDone = reviewN === 0 && newN === 0;
  const rank = rankOf(meta.xp);
  const stages = useMemo(() => stageList(recipes, meta), [recipes, meta]);

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
          <h1 className="hello">내소네 레시피북</h1>
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

      <section className="rank-card">
        <div className="rank-top">
          <span className="rank-name">☕ {rank.name}</span>
          <span className="muted small">{meta.xp} XP</span>
        </div>
        <div className="bar xp">
          <div style={{ width: `${rank.progress * 100}%` }} />
        </div>
        <div className="muted small">{rank.next ? `${rank.next}까지 ${rank.toNext} XP` : '최고 등급 달성!'}</div>
      </section>

      <section className="today-card">
        <div className="today-title">오늘의 주문</div>
        {!dailyDone ? (
          <>
            <div className="today-nums">
              <div>
                <span className="big-n">{reviewN}</span>
                <span className="lbl">복습 메뉴</span>
              </div>
              <div>
                <span className="big-n">{newN}</span>
                <span className="lbl">새 메뉴</span>
              </div>
            </div>
            <button className="btn primary big full" onClick={() => nav({ name: 'play', mode: 'daily', k: Date.now() })}>
              주문 받기 ▶
            </button>
          </>
        ) : (
          <>
            <p className="today-done">오늘 몫은 다 했어요 🎉<br /><span className="muted small">더 하고 싶으면 계속할 수 있어요</span></p>
            <button className="btn primary big full" onClick={() => nav({ name: 'play', mode: 'extra', k: Date.now() })}>
              한 판 더 ▶
            </button>
          </>
        )}
        <button className="btn full rush-btn" onClick={() => nav({ name: 'rush' })}>
          ⏱ 주문 러시 60초 <span className="muted small">최고 {meta.rushBest}개</span>
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>스테이지</h2>
          <span className="muted">
            ★ {stages.reduce((a, s) => a + s.stars, 0)} / {stages.length * 3}
          </span>
        </div>
        <ol className="stage-path">
          {stages.map((s, i) => (
            <li key={s.family.id} className={`stage ${s.unlocked ? '' : 'locked'} ${s.stars ? 'cleared' : ''}`} style={{ ['--i' as any]: i % 4 }}>
              <button
                className="stage-btn"
                disabled={!s.unlocked}
                onClick={() => nav({ name: 'play', mode: 'stage', familyId: s.family.id, k: Date.now() })}
              >
                <span className="stage-no">{s.unlocked ? i + 1 : '🔒'}</span>
                <span className="stage-info">
                  <b>{s.family.name}</b>
                  <span className="stage-stars">
                    {[1, 2, 3].map((n) => (
                      <i key={n} className={n <= s.stars ? 'on' : ''}>★</i>
                    ))}
                    <span className="muted small"> · 메뉴 {s.count}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="hint">스테이지를 깨면(별 1개 이상) 다음 스테이지가 열려요.</p>
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
