import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { RangeKey } from './types';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

type StatsView = {
  today: Date;
  range: RangeKey;
  anchor: Date;
  setRange: (r: RangeKey) => void;
  setAnchor: (d: Date) => void;
};

const Ctx = createContext<StatsView | null>(null);

/** 통계 메인과 상세(저항·카테고리·리포트)가 같은 기간/기준 날짜를 공유 */
export function StatsViewProvider({ children }: { children: ReactNode }) {
  const today = useMemo(startOfToday, []);
  const [range, setRange] = useState<RangeKey>('month');
  const [anchor, setAnchor] = useState<Date>(() => startOfToday());
  const value = useMemo(() => ({ today, range, anchor, setRange, setAnchor }), [today, range, anchor]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStatsView(): StatsView {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStatsView must be used within StatsViewProvider');
  return ctx;
}
