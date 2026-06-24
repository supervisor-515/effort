import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RangeKey } from './types';
import { toISODate } from './lib/format';

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

/** 통계 메인과 상세(저항·카테고리·리포트)가 같은 기간/기준 날짜를 공유.
 *  today 는 자정을 넘기거나 앱이 다시 보일 때 자동으로 갱신된다. */
export function StatsViewProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState<Date>(startOfToday);
  const [range, setRange] = useState<RangeKey>('month');
  const [anchor, setAnchor] = useState<Date>(() => startOfToday());

  // 자정 경과 / 포커스 복귀 시 today 재계산
  useEffect(() => {
    const refresh = () => {
      const t = startOfToday();
      setToday((prev) => (toISODate(prev) === toISODate(t) ? prev : t));
    };
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', refresh);
      window.clearInterval(id);
    };
  }, []);

  const value = useMemo(() => ({ today, range, anchor, setRange, setAnchor }), [today, range, anchor]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStatsView(): StatsView {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStatsView must be used within StatsViewProvider');
  return ctx;
}
