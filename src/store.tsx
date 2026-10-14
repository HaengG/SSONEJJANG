import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Recipe } from './data/recipes';
import * as db from './lib/db';
import { newCard, review, type Card, type Grade } from './lib/srs';

interface Store extends db.LoadedState {
  ready: boolean;
  persistent: boolean;
  rate: (recipeId: string, grade: Grade, mode: 'flash' | 'cloze', wrong?: number, total?: number) => Promise<Card>;
  markIntroduced: () => Promise<void>;
  saveRecipe: (r: Recipe, isNew: boolean) => Promise<void>;
  removeRecipe: (id: string) => Promise<void>;
  updateSettings: (s: Partial<db.Settings>) => Promise<void>;
  reload: () => Promise<void>;
  finishGame: (r: GameResult) => Promise<void>;
}

export interface GameResult {
  ratings: { recipeId: string; grade: Grade; wrong: number; total: number }[];
  xp: number;
  stage?: { familyId: string; stars: number };
  rushScore?: number;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<db.LoadedState>({ recipes: [], cards: {}, logs: [], meta: db.DEFAULT_META });
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);

  const reload = useCallback(async () => {
    const s = await db.loadAll();
    setState(s);
    setPersistent(await db.isPersistentStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setMeta = async (meta: db.Meta) => {
    await db.putMeta(meta);
    setState((s) => ({ ...s, meta }));
  };

  const rate: Store['rate'] = async (recipeId, grade, mode, wrong, total) => {
    const prev = state.cards[recipeId] ?? newCard();
    const next = review(prev, grade);
    await db.putCard(recipeId, next);
    const log = await db.addLog({ recipeId, ts: Date.now(), rating: grade, mode, wrong, total });
    const t = db.today();
    const meta = state.meta.studyDays.includes(t)
      ? state.meta
      : { ...state.meta, studyDays: [...state.meta.studyDays, t].slice(-400) };
    if (meta !== state.meta) await db.putMeta(meta);
    setState((s) => ({ ...s, cards: { ...s.cards, [recipeId]: next }, logs: [...s.logs, log], meta }));
    return next;
  };

  const markIntroduced = async () => {
    const t = db.today();
    const cur = state.meta.introduced;
    await setMeta({ ...state.meta, introduced: { date: t, count: cur.date === t ? cur.count + 1 : 1 } });
  };

  const saveRecipe: Store['saveRecipe'] = async (r, isNew) => {
    await db.putRecipe(r);
    let meta = state.meta;
    let cards = state.cards;
    if (isNew) {
      meta = { ...meta, recipeOrder: [...meta.recipeOrder, r.id] };
      await db.putMeta(meta);
      const c = newCard();
      await db.putCard(r.id, c);
      cards = { ...cards, [r.id]: c };
    }
    setState((s) => ({
      ...s,
      meta,
      cards,
      recipes: isNew ? [...s.recipes, r] : s.recipes.map((x) => (x.id === r.id ? r : x))
    }));
  };

  const removeRecipe = async (id: string) => {
    await db.deleteRecipe(id);
    const meta = { ...state.meta, recipeOrder: state.meta.recipeOrder.filter((x) => x !== id) };
    await db.putMeta(meta);
    setState((s) => {
      const cards = { ...s.cards };
      delete cards[id];
      return { ...s, meta, cards, recipes: s.recipes.filter((x) => x.id !== id) };
    });
  };

  const updateSettings = async (patch: Partial<db.Settings>) => {
    await setMeta({ ...state.meta, settings: { ...state.meta.settings, ...patch } });
  };

  const finishGame: Store['finishGame'] = async ({ ratings, xp, stage, rushScore }) => {
    const cards = { ...state.cards };
    const newLogs: db.LogRec[] = [];
    for (const r of ratings) {
      const next = review(cards[r.recipeId] ?? newCard(), r.grade);
      cards[r.recipeId] = next;
      await db.putCard(r.recipeId, next);
      newLogs.push(await db.addLog({ recipeId: r.recipeId, ts: Date.now(), rating: r.grade, mode: 'game', wrong: r.wrong, total: r.total }));
    }
    const t = db.today();
    const m = state.meta;
    const played = ratings.length > 0 || (rushScore ?? 0) > 0;
    const meta: db.Meta = {
      ...m,
      xp: m.xp + xp,
      studyDays: played && !m.studyDays.includes(t) ? [...m.studyDays, t].slice(-400) : m.studyDays,
      stages: stage
        ? {
            ...m.stages,
            [stage.familyId]: {
              stars: Math.max(stage.stars, m.stages[stage.familyId]?.stars ?? 0),
              plays: (m.stages[stage.familyId]?.plays ?? 0) + 1
            }
          }
        : m.stages,
      rushBest: Math.max(m.rushBest, rushScore ?? 0)
    };
    await db.putMeta(meta);
    setState((s) => ({ ...s, cards, meta, logs: [...s.logs, ...newLogs] }));
  };

  const value = useMemo<Store>(
    () => ({ ...state, ready, persistent, rate, markIntroduced, saveRecipe, removeRecipe, updateSettings, reload, finishGame }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, ready, persistent]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
