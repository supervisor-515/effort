import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Category, Entry, Resistance, Settings } from './types';
import { currentBand } from './lib/format';
import { CATEGORY_PALETTE, DEFAULT_CATEGORIES, generateDemoEntries } from './lib/demo';

const K = {
  real: 'effort.real.entries',
  demo: 'effort.demo.entries',
  cats: 'effort.categories',
  settings: 'effort.settings',
  demoMode: 'effort.demoMode',
};

const DEFAULT_SETTINGS: Settings = {
  resistanceCoef: 0.3,
  theme: 'auto',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패는 조용히 무시 */
  }
}

const uid = () => `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export type NewEntry = {
  date: string;
  text: string;
  units: number;
  resistance: Resistance;
  categoryId: string;
  band?: number;
};

export type EntryPatch = Partial<Omit<Entry, 'id'>>;

export type BackupData = {
  app: 'effort-tracker';
  version: 1;
  exportedAt: string;
  entries: Entry[];
  categories: Category[];
  settings: Settings;
};

type Store = {
  entries: Entry[]; // 현재 활성(데모/실제) 항목
  categories: Category[];
  settings: Settings;
  demoMode: boolean;
  addEntry: (e: NewEntry) => void;
  updateEntry: (id: string, patch: EntryPatch) => void;
  removeEntry: (id: string) => void;
  restoreEntry: (entry: Entry) => void;
  addCategory: (name: string, color?: string) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  moveCategory: (id: string, dir: -1 | 1) => void;
  /** reassignTo 지정 시 해당 카테고리 기록을 이동, 미지정 시 기록도 함께 삭제 */
  removeCategory: (id: string, reassignTo?: string) => void;
  categoryEntryCount: (id: string) => number;
  updateSettings: (patch: Partial<Settings>) => void;
  setDemoMode: (on: boolean) => void;
  exportData: () => BackupData;
  importData: (data: unknown) => { ok: boolean; error?: string };
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [realEntries, setRealEntries] = useState<Entry[]>(() => load(K.real, []));
  const [demoEntries, setDemoEntries] = useState<Entry[]>(() => load<Entry[]>(K.demo, []));
  const [storedCats, setStoredCats] = useState<Category[]>(() => load(K.cats, DEFAULT_CATEGORIES));
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load(K.settings, {}) }));
  const [demoMode, setDemoModeState] = useState<boolean>(() => load(K.demoMode, false));
  const palIdx = useRef<number>(0);

  useEffect(() => save(K.real, realEntries), [realEntries]);
  useEffect(() => save(K.demo, demoEntries), [demoEntries]);
  useEffect(() => save(K.cats, storedCats), [storedCats]);
  useEffect(() => save(K.settings, settings), [settings]);
  useEffect(() => save(K.demoMode, demoMode), [demoMode]);

  const setDemoMode = useCallback((on: boolean) => {
    if (on) setDemoEntries((prev) => (prev.length ? prev : generateDemoEntries()));
    setDemoModeState(on);
  }, []);

  const categories = useMemo<Category[]>(() => {
    if (!demoMode) return storedCats;
    const byId = new Map(storedCats.map((c) => [c.id, c]));
    for (const c of DEFAULT_CATEGORIES) if (!byId.has(c.id)) byId.set(c.id, c);
    return [...byId.values()];
  }, [demoMode, storedCats]);

  const entries = demoMode ? demoEntries : realEntries;
  const setEntries = demoMode ? setDemoEntries : setRealEntries;

  const addEntry = useCallback((e: NewEntry) => {
    setEntries((prev) => [
      ...prev,
      { id: uid(), band: e.band ?? currentBand(), ...e },
    ]);
  }, [setEntries]);

  const updateEntry = useCallback((id: string, patch: EntryPatch) => {
    setEntries((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, [setEntries]);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((x) => x.id !== id));
  }, [setEntries]);

  const restoreEntry = useCallback((entry: Entry) => {
    setEntries((prev) => (prev.some((x) => x.id === entry.id) ? prev : [...prev, entry]));
  }, [setEntries]);

  const addCategory = useCallback((name: string, color?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredCats((prev) => {
      const c = color ?? CATEGORY_PALETTE[palIdx.current % CATEGORY_PALETTE.length];
      palIdx.current += 1;
      return [...prev, { id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, name: trimmed, color: c }];
    });
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Omit<Category, 'id'>>) => {
    setStoredCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const moveCategory = useCallback((id: string, dir: -1 | 1) => {
    setStoredCats((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const categoryEntryCount = useCallback((id: string) => entries.filter((e) => e.categoryId === id).length, [entries]);

  const removeCategory = useCallback((id: string, reassignTo?: string) => {
    const reassign = (list: Entry[]) =>
      reassignTo
        ? list.map((e) => (e.categoryId === id ? { ...e, categoryId: reassignTo } : e))
        : list.filter((e) => e.categoryId !== id);
    setRealEntries(reassign);
    setDemoEntries(reassign);
    setStoredCats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const exportData = useCallback((): BackupData => ({
    app: 'effort-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: realEntries,
    categories: storedCats,
    settings,
  }), [realEntries, storedCats, settings]);

  const importData = useCallback((data: unknown): { ok: boolean; error?: string } => {
    if (!data || typeof data !== 'object') return { ok: false, error: '파일 형식이 올바르지 않아요.' };
    const d = data as Partial<BackupData>;
    if (d.app !== 'effort-tracker' || !Array.isArray(d.entries) || !Array.isArray(d.categories)) {
      return { ok: false, error: '노력 기록 백업 파일이 아니에요.' };
    }
    // 가벼운 형태 검증
    const validEntry = (e: unknown): e is Entry => {
      const x = e as Entry;
      return !!x && typeof x.id === 'string' && typeof x.date === 'string'
        && typeof x.units === 'number' && typeof x.categoryId === 'string';
    };
    const validCat = (c: unknown): c is Category => {
      const x = c as Category;
      return !!x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.color === 'string';
    };
    if (!d.entries.every(validEntry) || !d.categories.every(validCat)) {
      return { ok: false, error: '백업 데이터가 손상된 것 같아요.' };
    }
    setRealEntries(d.entries as Entry[]);
    setStoredCats(d.categories as Category[]);
    if (d.settings && typeof d.settings === 'object') {
      setSettings({ ...DEFAULT_SETTINGS, ...(d.settings as Settings) });
    }
    setDemoModeState(false);
    return { ok: true };
  }, []);

  const value: Store = {
    entries, categories, settings, demoMode,
    addEntry, updateEntry, removeEntry, restoreEntry,
    addCategory, updateCategory, moveCategory, removeCategory, categoryEntryCount,
    updateSettings, setDemoMode, exportData, importData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function useCategoryMap(): Map<string, Category> {
  const { categories } = useStore();
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
}
