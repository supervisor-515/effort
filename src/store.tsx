import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Category, Entry, Resistance, Settings } from './types';
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
  reminderOn: false,
  reminderTime: '21:00',
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
};

type Store = {
  entries: Entry[]; // 현재 활성(데모/실제) 항목
  categories: Category[];
  settings: Settings;
  demoMode: boolean;
  addEntry: (e: NewEntry) => void;
  removeEntry: (id: string) => void;
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setDemoMode: (on: boolean) => void;
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
    if (on) {
      setDemoEntries((prev) => (prev.length ? prev : generateDemoEntries()));
    }
    setDemoModeState(on);
  }, []);

  // 데모 모드에서는 기본 카테고리를 보장(이름/색 해석용)
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
      { id: uid(), hour: new Date().getHours(), ...e },
    ]);
  }, [setEntries]);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((x) => x.id !== id));
  }, [setEntries]);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredCats((prev) => {
      const color = CATEGORY_PALETTE[palIdx.current % CATEGORY_PALETTE.length];
      palIdx.current += 1;
      return [...prev, { id: `c-${Date.now().toString(36)}`, name: trimmed, color }];
    });
  }, []);

  const removeCategory = useCallback((id: string) => {
    setStoredCats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value: Store = {
    entries,
    categories,
    settings,
    demoMode,
    addEntry,
    removeEntry,
    addCategory,
    removeCategory,
    updateSettings,
    setDemoMode,
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
