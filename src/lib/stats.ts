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

// ───────────── 연간 캘린더 히트맵 ─────────────

export type CalLevel = 0 | 1 | 2 | 3 | 4;
export type CalCell = { date: string; total: number; level: CalLevel; future: boolean };

/** GitHub 잔디형 그리드: 열=주(과거→현재), 각 열은 일~토 7칸. weeks 기본 53(약 1년). */
export function calendarGrid(entries: Entry[], coef: number, today: Date, weeks = 53): CalCell[][] {
  const map = aggregateByDay(entries, coef);
  const lastSun = addDays(today, -today.getDay()); // 이번 주 일요일
  // 표시 범위 안의 최댓값으로 레벨 구간 산정
  let maxT = 0;
  for (let c = weeks - 1; c >= 0; c--) {
    const colSun = addDays(lastSun, -7 * c);
    for (let d = 0; d < 7; d++) {
      const t = map.get(toISODate(addDays(colSun, d)))?.total ?? 0;
      if (t > maxT) maxT = t;
    }
  }
  const levelOf = (t: number): CalLevel => {
    if (t <= 0 || maxT <= 0) return 0;
    const r = t / maxT;
    if (r <= 0.25) return 1;
    if (r <= 0.5) return 2;
    if (r <= 0.75) return 3;
    return 4;
  };
  const cols: CalCell[][] = [];
  for (let c = weeks - 1; c >= 0; c--) {
    const colSun = addDays(lastSun, -7 * c);
    const col: CalCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(colSun, d);
      const iso = toISODate(day);
      const total = map.get(iso)?.total ?? 0;
      col.push({ date: iso, total, level: levelOf(total), future: day > today });
    }
    cols.push(col);
  }
  return cols;
}

// ───────────── 페이스 예측 ─────────────

export type Projection = { projected: number; elapsed: number; total: number; remaining: number };

/** 이번 달/올해 현재 누적과 경과 비율로 기말 예상치 산출(현재 기간일 때만 의미). */
export function projection(entries: Entry[], coef: number, today: Date, range: 'month' | 'year'): Projection | null {
  const map = aggregateByDay(entries, coef);
  let cur: DayAgg[];
  let elapsed: number;
  let total: number;
  if (range === 'month') {
    cur = [...map.values()].filter((d) => {
      const dt = parseISODate(d.date);
      return dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth();
    });
    total = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    elapsed = today.getDate();
  } else {
    cur = [...map.values()].filter((d) => parseISODate(d.date).getFullYear() === today.getFullYear());
    const start = new Date(today.getFullYear(), 0, 1);
    total = (new Date(today.getFullYear(), 11, 31).getTime() - start.getTime()) / 86400000 + 1;
    elapsed = (today.getTime() - start.getTime()) / 86400000 + 1;
  }
  const sum = cur.reduce((a, d) => a + d.total, 0);
  if (sum <= 0 || elapsed <= 0) return null;
  const projected = (sum / elapsed) * total;
  return { projected, elapsed: Math.round(elapsed), total: Math.round(total), remaining: Math.max(0, Math.round(total - elapsed)) };
}

// ───────────── 일일 목표 달성 ─────────────

export type GoalStats = { metDays: number; activeDays: number; goal: number };

/** 기간 내 '하루 노력량 ≥ 목표'를 달성한 날 수. */
export function goalStats(entries: Entry[], coef: number, goal: number, filter: (e: Entry) => boolean): GoalStats {
  const map = aggregateByDay(entries.filter(filter), coef);
  const days = [...map.values()];
  const metDays = days.filter((d) => d.total >= goal).length;
  return { metDays, activeDays: days.length, goal };
}

// ───────────── 저항도 분포 ─────────────

/** 저항 0~5 별 [항목 수, 노력량] */
export function resistanceHistogram(entries: Entry[], coef: number): { count: number[]; effort: number[] } {
  const count = [0, 0, 0, 0, 0, 0];
  const effort = [0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    const r = e.resistance;
    count[r] += 1;
    effort[r] += entryEffort(e, coef);
  }
  return { count, effort };
}

// ───────────── 평일 vs 주말 ─────────────

export type WeekendSplit = { weekdayAvg: number; weekendAvg: number; weekdayRes: number; weekendRes: number };

/** 평일/주말의 '활동한 하루 평균 노력량'과 평균 저항. */
export function weekendSplit(entries: Entry[], coef: number): WeekendSplit {
  const days = [...aggregateByDay(entries, coef).values()];
  let wdT = 0, wdN = 0, weT = 0, weN = 0;
  let wdRsum = 0, wdRcnt = 0, weRsum = 0, weRcnt = 0;
  for (const d of days) {
    const dow = parseISODate(d.date).getDay();
    const weekend = dow === 0 || dow === 6;
    if (weekend) { weT += d.total; weN += 1; weRsum += d.resSum; weRcnt += d.count; }
    else { wdT += d.total; wdN += 1; wdRsum += d.resSum; wdRcnt += d.count; }
  }
  return {
    weekdayAvg: wdN ? wdT / wdN : 0,
    weekendAvg: weN ? weT / weN : 0,
    weekdayRes: wdRcnt ? wdRsum / wdRcnt : 0,
    weekendRes: weRcnt ? weRsum / weRcnt : 0,
  };
}

// ───────────── 전체 누적 ─────────────

export type Lifetime = { effort: number; hours: number; entries: number; activeDays: number; firstDate: string | null };

/** 시작 이후 전체 누적치. */
export function lifetimeTotals(entries: Entry[], coef: number): Lifetime {
  if (entries.length === 0) return { effort: 0, hours: 0, entries: 0, activeDays: 0, firstDate: null };
  const days = new Set<string>();
  let effort = 0, hours = 0, first = entries[0].date;
  for (const e of entries) {
    effort += entryEffort(e, coef);
    hours += entryHours(e);
    days.add(e.date);
    if (e.date < first) first = e.date;
  }
  return { effort, hours, entries: entries.length, activeDays: days.size, firstDate: first };
}

// ───────────── CSV 내보내기 ─────────────

/** 기록을 CSV 문자열로. (엑셀/외부 분석용) */
export function toCSV(entries: Entry[], categories: Category[], coef: number): string {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const header = ['date', 'category', 'text', 'hours', 'resistance', 'effort'];
  const rows = [...entries]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => [
      e.date,
      esc(catName.get(e.categoryId) ?? e.categoryId),
      esc(e.text),
      entryHours(e).toFixed(2),
      String(e.resistance),
      entryEffort(e, coef).toFixed(2),
    ].join(','));
  return [header.join(','), ...rows].join('\n');
}
