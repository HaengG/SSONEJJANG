import { openDB, type IDBPDatabase } from 'idb';
import { RECIPES, SEED_VERSION, type Recipe } from '../data/recipes';
import { newCard, reviveCard, type Card } from './srs';

export interface CardRec {
  recipeId: string;
  card: Card;
}

export interface LogRec {
  id?: number;
  recipeId: string;
  ts: number;
  rating: number;
  mode: 'flash' | 'cloze';
  wrong?: number;
  total?: number;
}

export interface Settings {
  newPerDay: number;
  hideInstallTip?: boolean;
}

export interface Meta {
  settings: Settings;
  seedVersion: number;
  studyDays: string[]; // 'YYYY-MM-DD'
  introduced: { date: string; count: number };
  recipeOrder: string[];
}

export const DEFAULT_META: Meta = {
  settings: { newPerDay: 5 },
  seedVersion: SEED_VERSION,
  studyDays: [],
  introduced: { date: '', count: 0 },
  recipeOrder: RECIPES.map((r) => r.id)
};

export const today = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

type DB = IDBPDatabase<unknown>;
let dbPromise: Promise<DB | null> | null = null;

// IndexedDB를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리에만 저장해요.
const mem = {
  recipes: new Map<string, Recipe>(),
  cards: new Map<string, CardRec>(),
  logs: [] as LogRec[],
  meta: null as Meta | null
};

function getDB(): Promise<DB | null> {
  if (!dbPromise) {
    dbPromise = openDB('timber-recipe', 1, {
      upgrade(db) {
        db.createObjectStore('recipes', { keyPath: 'id' });
        db.createObjectStore('cards', { keyPath: 'recipeId' });
        db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('meta');
      }
    }).catch(() => null);
  }
  return dbPromise;
}

export async function isPersistentStorage(): Promise<boolean> {
  return (await getDB()) !== null;
}

export interface LoadedState {
  recipes: Recipe[];
  cards: Record<string, Card>;
  logs: LogRec[];
  meta: Meta;
}

export async function loadAll(): Promise<LoadedState> {
  const db = await getDB();
  let meta: Meta | null;
  let recipes: Recipe[];
  let cardRecs: CardRec[];
  let logs: LogRec[];
  if (db) {
    meta = ((await db.get('meta', 'meta')) as Meta) ?? null;
    recipes = (await db.getAll('recipes')) as Recipe[];
    cardRecs = (await db.getAll('cards')) as CardRec[];
    logs = (await db.getAll('logs')) as LogRec[];
  } else {
    meta = mem.meta;
    recipes = [...mem.recipes.values()];
    cardRecs = [...mem.cards.values()];
    logs = mem.logs;
  }

  if (!meta || recipes.length === 0) {
    meta = { ...DEFAULT_META, studyDays: meta?.studyDays ?? [], settings: meta?.settings ?? DEFAULT_META.settings };
    recipes = RECIPES;
    await putMeta(meta);
    for (const r of recipes) await putRecipe(r);
  }

  const cards: Record<string, Card> = {};
  for (const c of cardRecs) cards[c.recipeId] = c.card;
  for (const r of recipes) {
    if (!cards[r.id]) {
      cards[r.id] = newCard();
      await putCard(r.id, cards[r.id]);
    }
  }

  const order = new Map(meta.recipeOrder.map((id, i) => [id, i]));
  recipes = [...recipes].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  return { recipes, cards, logs, meta };
}

export async function putRecipe(r: Recipe) {
  const db = await getDB();
  if (db) await db.put('recipes', r);
  else mem.recipes.set(r.id, r);
}

export async function deleteRecipe(id: string) {
  const db = await getDB();
  if (db) {
    await db.delete('recipes', id);
    await db.delete('cards', id);
  } else {
    mem.recipes.delete(id);
    mem.cards.delete(id);
  }
}

export async function putCard(recipeId: string, card: Card) {
  const db = await getDB();
  const rec: CardRec = { recipeId, card };
  if (db) await db.put('cards', rec);
  else mem.cards.set(recipeId, rec);
}

export async function addLog(input: LogRec): Promise<LogRec> {
  const { id: _drop, ...log } = input;
  const db = await getDB();
  if (db) {
    const id = (await db.add('logs', log)) as number;
    return { ...log, id };
  }
  const rec = { ...log, id: mem.logs.length + 1 };
  mem.logs.push(rec);
  return rec;
}

export async function putMeta(meta: Meta) {
  const db = await getDB();
  if (db) await db.put('meta', meta, 'meta');
  else mem.meta = meta;
}

async function clearStores(names: string[]) {
  const db = await getDB();
  if (db) for (const n of names) await db.clear(n);
  else {
    if (names.includes('recipes')) mem.recipes.clear();
    if (names.includes('cards')) mem.cards.clear();
    if (names.includes('logs')) mem.logs = [];
  }
}

/** 학습 기록만 지우기 (레시피는 그대로) */
export async function resetProgress(recipes: Recipe[], meta: Meta) {
  await clearStores(['cards', 'logs']);
  for (const r of recipes) await putCard(r.id, newCard());
  await putMeta({ ...meta, studyDays: [], introduced: { date: '', count: 0 } });
}

/** 레시피를 원본(레시피북)으로 되돌리기. 학습 기록은 유지. */
export async function restoreDefaultRecipes(meta: Meta) {
  await clearStores(['recipes']);
  for (const r of RECIPES) await putRecipe(r);
  await putMeta({ ...meta, recipeOrder: RECIPES.map((r) => r.id), seedVersion: SEED_VERSION });
}

export interface Backup {
  app: 'timber-recipe';
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
  cards: CardRec[];
  logs: LogRec[];
  meta: Meta;
}

export function makeBackup(s: LoadedState): Backup {
  return {
    app: 'timber-recipe',
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: s.recipes,
    cards: Object.entries(s.cards).map(([recipeId, card]) => ({ recipeId, card })),
    logs: s.logs,
    meta: s.meta
  };
}

export async function restoreBackup(b: Backup) {
  if (b?.app !== 'timber-recipe' || !Array.isArray(b.recipes)) throw new Error('백업 파일 형식이 아니에요.');
  await clearStores(['recipes', 'cards', 'logs']);
  for (const r of b.recipes) await putRecipe(r);
  for (const c of b.cards) await putCard(c.recipeId, reviveCard(c.card));
  for (const l of b.logs) await addLog(l);
  await putMeta(b.meta);
}
