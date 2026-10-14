import { useState, type ReactNode } from 'react';
import { useStore } from './store';
import { Home } from './screens/Home';
import { BookList, FamilyView, RecipeDetail, RecipeEdit } from './screens/Book';
import { Practice } from './screens/Practice';
import { Settings } from './screens/Settings';
import { Session, buildDailyQueue, newLeftToday, type QItem } from './screens/Session';

export type Route =
  | { name: 'home' }
  | { name: 'book' }
  | { name: 'practice' }
  | { name: 'settings' }
  | { name: 'study' }
  | { name: 'recipe'; id: string }
  | { name: 'edit'; id?: string }
  | { name: 'family'; id: string }
  | { name: 'practiceOne'; id: string }
  | { name: 'practiceRun'; items: QItem[]; title: string };

export type Nav = (r: Route) => void;

const TABS: { name: Route['name']; label: string; icon: ReactNode }[] = [
  {
    name: 'home',
    label: '홈',
    icon: <path d="M4 11.5 L12 4.5 L20.2 11.3 M6.3 10 V19.6 H17.8 V9.8 M10 19.5 V14 H14 V19.5" />
  },
  {
    name: 'book',
    label: '레시피북',
    icon: <path d="M4.5 5.2 C7.5 4.2 10 4.6 12 6.2 C14 4.6 16.5 4.2 19.6 5.1 V18.8 C16.5 18 14 18.3 12 19.8 C10 18.3 7.5 18 4.4 18.9 Z M12 6.2 V19.6" />
  },
  {
    name: 'practice',
    label: '연습실',
    icon: <path d="M15.5 4.6 L19.4 8.5 L9 18.9 L4.6 19.5 L5.1 15.1 Z M13.3 6.8 L17.2 10.7" />
  },
  {
    name: 'settings',
    label: '설정',
    icon: (
      <>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3.5 V6 M12 18 V20.5 M3.5 12 H6 M18 12 H20.5 M6 6 L7.7 7.7 M16.3 16.3 L18 18 M6 18 L7.7 16.3 M16.3 7.7 L18 6" />
      </>
    )
  }
];

export default function App() {
  const store = useStore();
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const route = stack[stack.length - 1];

  const nav: Nav = (r) => {
    window.scrollTo(0, 0);
    if (['home', 'book', 'practice', 'settings'].includes(r.name)) setStack([r]);
    else setStack((s) => [...s, r]);
  };
  const back = () => {
    window.scrollTo(0, 0);
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };

  if (!store.ready) {
    return <div className="loading">레시피북 펼치는 중…</div>;
  }

  let body: ReactNode;
  let fullscreen = false;
  switch (route.name) {
    case 'home':
      body = <Home nav={nav} />;
      break;
    case 'book':
      body = <BookList nav={nav} />;
      break;
    case 'practice':
      body = <Practice nav={nav} />;
      break;
    case 'settings':
      body = <Settings />;
      break;
    case 'recipe':
      body = <RecipeDetail id={route.id} nav={nav} back={back} />;
      break;
    case 'family':
      body = <FamilyView id={route.id} nav={nav} back={back} />;
      break;
    case 'edit':
      body = (
        <RecipeEdit
          id={route.id}
          back={back}
          done={(id) => {
            // 수정 화면을 닫고, 새로 만든 메뉴면 상세로 이동
            setStack((s) => {
              const base = s.slice(0, -1);
              if (!id) return base.filter((r) => !(r.name === 'recipe' && r.id === route.id));
              if (!route.id) return [...base, { name: 'recipe', id }];
              return base;
            });
          }}
        />
      );
      break;
    case 'study': {
      fullscreen = true;
      const items = buildDailyQueue(store.recipes, store.cards, newLeftToday(store.meta));
      body = <Session key="study" initial={items} title="오늘의 학습" onExit={back} />;
      break;
    }
    case 'practiceOne': {
      fullscreen = true;
      const items: QItem[] = [1, 2, 3].map((d) => ({ id: route.id, step: 'cloze', diff: d as 1 | 2 | 3 }));
      body = <Session key={`one-${route.id}`} initial={items} practice title="빈칸 연습 · 점점 어렵게" onExit={back} />;
      break;
    }
    case 'practiceRun':
      fullscreen = true;
      body = <Session key={`run-${stack.length}`} initial={route.items} practice title={route.title} onExit={back} />;
      break;
  }

  const activeTab = stack[0].name;
  return (
    <div className={`app ${fullscreen ? 'fullscreen' : ''}`}>
      <main>{body}</main>
      {!fullscreen && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.name} className={activeTab === t.name ? 'on' : ''} onClick={() => nav({ name: t.name } as Route)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
