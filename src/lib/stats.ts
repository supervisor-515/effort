import type { Category, Entry, RangeKey } from '../types';
import { addDays, toISODate, parseISODate, f1, fmtHM, entryBand } from './format';
import { aggregateByDay, entryEffort, entryHours, isClay, isJoy, type DayAgg } from './score';

const emptyDay = (date: string): DayAgg => ({
  date, total: 0, hours: 0, joy: 0, clay: 0, resSum: 0, count: 0, resAvg: 0, entries: [],
});

/** today 기준 과거 count일의 연속 일별 집계 (oldest → today) */
export function daySeries(entries: Entry[], coef: number, today: Date, count: number): DayAgg[] {
  const map = aggregateByDay(entries, coef);
  const out: DayAgg[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = toISODate(d);
    out.push(map.get(key) ?? emptyDay(key));
  }
  return out;
}

const sumOf = (arr: DayAgg[], k: 'total' | 'hours' | 'joy' | 'clay'): number =>
  arr.reduce((a, d) => a + d[k], 0);

const avgResOf = (arr: DayAgg[]): number => {
  let s = 0, c = 0;
  for (const d of arr) { s += d.resSum; c += d.count; }
  return c ? s / c : 0;
};

const monthDays = (entries: Entry[], coef: number, year: number, month: number): DayAgg[] => {
  const map = aggregateByDay(entries, coef);
  return [...map.values()].filter((d) => {
    const dt = parseISODate(d.date);
    return dt.getFullYear() === year && dt.getMonth() === month;
  });
};

const yearDays = (entries: Entry[], coef: number, year: number): DayAgg[] => {
  const map = aggregateByDay(entries, coef);
  return [...map.values()].filter((d) => parseISODate(d.date).getFullYear() === year);
};

export type PeriodStats = {
  total: number;
  hours: number;
  avgRes: number;
  clayPct: number; // 0~100
  joyPct: number;
  deltaPct: number | null; // 직전 기간 대비 %
  hasData: boolean;
};

export function periodStats(entries: Entry[], coef: number, today: Date, range: RangeKey): PeriodStats {
  let cur: DayAgg[];
  let prev: DayAgg[];
  if (range === 'day') {
    const s = daySeries(entries, coef, today, 2);
    cur = [s[1]];
    prev = [s[0]];
  } else if (range === 'week') {
    const s = daySeries(entries, coef, today, 14);
    cur = s.slice(7);
    prev = s.slice(0, 7);
  } else if (range === 'month') {
    cur = monthDays(entries, coef, today.getFullYear(), today.getMonth());
    const pm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    prev = monthDays(entries, coef, pm.getFullYear(), pm.getMonth());
  } else {
    cur = yearDays(entries, coef, today.getFullYear());
    prev = yearDays(entries, coef, today.getFullYear() - 1);
  }
  const total = sumOf(cur, 'total');
  const clay = sumOf(cur, 'clay');
  const prevTotal = sumOf(prev, 'total');
  const clayPct = total ? Math.round((clay / total) * 100) : 0;
  return {
    total,
    hours: sumOf(cur, 'hours'),
    avgRes: avgResOf(cur),
    clayPct,
    joyPct: 100 - clayPct,
    deltaPct: prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null,
    hasData: total > 0,
  };
}

/** 막대 차트용 흐름 데이터 */
export type FlowBar = { label: string; total: number; joy: number; clay: number; body: string; idx?: number };
export type Flow = { bars: FlowBar[]; maxT: number; ma: number[]; showMa: boolean };

export function buildFlow(entries: Entry[], coef: number, today: Date, range: RangeKey, maWin: 7 | 30): Flow {
  const bars: FlowBar[] = [];
  let ma: number[] = [];
  let showMa = false;

  if (range === 'day') {
    const series = daySeries(entries, coef, today, 30 + 14);
    const recent = series.slice(-14);
    recent.forEach((d, i) => {
      const dt = parseISODate(d.date);
      bars.push({
        label: String(dt.getDate()),
        total: d.total, joy: d.joy, clay: d.clay,
        idx: series.length - 14 + i,
        body: d.total > 0
          ? `${f1(d.total)}점 · ${fmtHM(d.hours)} · 평균 저항 ${f1(d.resAvg)}`
          : '기록이 없는 날이에요',
      });
    });
    showMa = true;
    bars.forEach((b) => {
      const idx = b.idx!;
      const w = series.slice(Math.max(0, idx - maWin + 1), idx + 1);
      ma.push(w.length ? w.reduce((a, d) => a + d.total, 0) / w.length : 0);
    });
  } else if (range === 'week') {
    const series = daySeries(entries, coef, today, 12 * 7);
    for (let w = 0; w < 12; w++) {
      const grp = series.slice(w * 7, w * 7 + 7);
      bars.push({
        label: w % 2 === 0 ? `${w + 1}주` : '',
        total: sumOf(grp, 'total'), joy: sumOf(grp, 'joy'), clay: sumOf(grp, 'clay'),
        body: `${f1(sumOf(grp, 'total'))}점 · ${fmtHM(sumOf(grp, 'hours'))} · 7일 합산`,
      });
    }
  } else if (range === 'month') {
    for (let m = 11; m >= 0; m--) {
      const dt = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const grp = monthDays(entries, coef, dt.getFullYear(), dt.getMonth());
      bars.push({
        label: `${dt.getMonth() + 1}월`,
        total: sumOf(grp, 'total'), joy: sumOf(grp, 'joy'), clay: sumOf(grp, 'clay'),
        body: `${f1(sumOf(grp, 'total'))}점 · ${fmtHM(sumOf(grp, 'hours'))} · 한 달 누적`,
      });
    }
  } else {
    const thisYear = today.getFullYear();
    for (let y = 3; y >= 0; y--) {
      const yr = thisYear - y;
      const grp = yearDays(entries, coef, yr);
      bars.push({
        label: String(yr),
        total: sumOf(grp, 'total'), joy: sumOf(grp, 'joy'), clay: sumOf(grp, 'clay'),
        body: `${f1(sumOf(grp, 'total'))}점 · 연간 누적`,
      });
    }
  }

  if (!showMa) {
    // 3구간 단순 이동평균(추세선)
    bars.forEach((_, i) => {
      const s = bars.slice(Math.max(0, i - 2), i + 1);
      ma.push(s.reduce((a, x) => a + x.total, 0) / s.length);
    });
  }
  const maxT = Math.max(...bars.map((b) => b.total), 0.1);
  return { bars, maxT, ma, showMa };
}

export type CatStat = {
  id: string;
  name: string;
  color: string;
  effort: number;
  hours: number;
  count: number;
  avgRes: number;
  clay: number;
  joy: number;
  clayRatio: number; // 0~1
  growth: number; // = 버텨낸 노력 합
};

export function categoryStats(
  entries: Entry[],
  categories: Category[],
  coef: number,
  filter?: (e: Entry) => boolean,
): CatStat[] {
  const src = filter ? entries.filter(filter) : entries;
  return categories.map((c) => {
    const es = src.filter((e) => e.categoryId === c.id);
    const effort = es.reduce((a, e) => a + entryEffort(e, coef), 0);
    const hours = es.reduce((a, e) => a + entryHours(e), 0);
    const clay = es.filter(isClay).reduce((a, e) => a + entryEffort(e, coef), 0);
    const joy = es.filter(isJoy).reduce((a, e) => a + entryEffort(e, coef), 0);
    const avgRes = es.length ? es.reduce((a, e) => a + e.resistance, 0) / es.length : 0;
    return {
      id: c.id, name: c.name, color: c.color,
      effort, hours, count: es.length, avgRes, clay, joy,
      clayRatio: effort ? clay / effort : 0,
      growth: clay,
    };
  });
}

/** 요일별 평균 저항도 [일..토] */
export function dowResistance(entries: Entry[]): number[] {
  const sum = [0, 0, 0, 0, 0, 0, 0];
  const cnt = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    const dow = parseISODate(e.date).getDay();
    sum[dow] += e.resistance;
    cnt[dow] += 1;
  }
  return sum.map((s, i) => (cnt[i] ? s / cnt[i] : 0));
}

/** 시간대(새벽/아침/점심/오후/저녁) × 요일 평균 저항도. 밴드 정보 없는 항목은 제외. */
export function heatmap(entries: Entry[]): { avg: number; has: boolean }[][] {
  const BANDS = 5;
  const sum = Array.from({ length: BANDS }, () => [0, 0, 0, 0, 0, 0, 0]);
  const cnt = Array.from({ length: BANDS }, () => [0, 0, 0, 0, 0, 0, 0]);
  for (const e of entries) {
    const band = entryBand(e);
    if (band == null) continue;
    const dow = parseISODate(e.date).getDay();
    sum[band][dow] += e.resistance;
    cnt[band][dow] += 1;
  }
  return sum.map((row, b) => row.map((s, d) => ({ avg: cnt[b][d] ? s / cnt[b][d] : 0, has: cnt[b][d] > 0 })));
}

/** 연속 기록(현재 streak) 과 최장 기록 */
export function streaks(entries: Entry[], today: Date): { current: number; max: number } {
  const days = new Set(entries.map((e) => e.date));
  // 최장
  const sorted = [...days].sort();
  let max = 0, run = 0, prev: Date | null = null;
  for (const ds of sorted) {
    const d = parseISODate(ds);
    if (prev && (d.getTime() - prev.getTime()) === 86400000) run += 1;
    else run = 1;
    max = Math.max(max, run);
    prev = d;
  }
  // 현재(오늘 또는 어제부터 역방향)
  let current = 0;
  let cursor = days.has(toISODate(today)) ? today : addDays(today, -1);
  while (days.has(toISODate(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, max };
}

/** 안정감 지수 0~100: 노력량 변동계수↓ + 기록률↑ */
export function stabilityIndex(entries: Entry[], coef: number, today: Date, count = 30): number {
  const series = daySeries(entries, coef, today, count);
  const totals = series.map((d) => d.total);
  const mean = totals.reduce((a, b) => a + b, 0) / count;
  if (mean <= 0) return 0;
  const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / count;
  const cv = Math.sqrt(variance) / mean; // 변동계수
  const recordRate = series.filter((d) => d.total > 0).length / count;
  const base = Math.max(0, 100 - cv * 60); // 변동 패널티
  const score = base * (0.5 + 0.5 * recordRate); // 공백 패널티
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** 노력 밀도 = 노력 점수 ÷ 투입 시간 */
export const density = (total: number, hours: number): number => (hours > 0 ? total / hours : 0);
