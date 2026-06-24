import { describe, it, expect } from 'vitest';
import type { Category, Entry, Resistance } from '../types';
import { toISODate, addDays } from './format';
import { buildFlow, projection } from './stats';
import { recapLine, ratioNote, periodFilter } from './period';
import { goalNote, histogramNote, weekendNote, projectionNote } from './insights';
import { buildFeed } from './feed';

const COEF = 0.3;
const entry = (date: string, units: number, resistance: Resistance, categoryId = 'study'): Entry =>
  ({ id: `${date}-${units}-${resistance}-${categoryId}`, date, text: 't', units, resistance, categoryId });

const CATS: Category[] = [{ id: 'study', name: '공부', color: '#000' }];

describe('period.recapLine', () => {
  it('handles empty data', () => {
    expect(recapLine({ range: 'week', clayPct: 0, deltaPct: null, hasData: false })).toContain('아직');
  });
  it('joy-led week reads light', () => {
    const s = recapLine({ range: 'week', clayPct: 10, deltaPct: null, hasData: true });
    expect(s).toContain('즐겁게');
  });
  it('appends delta when significant', () => {
    const s = recapLine({ range: 'week', clayPct: 50, deltaPct: 30, hasData: true });
    expect(s).toContain('30%');
  });
});

describe('period.ratioNote', () => {
  it('low clay → mostly joy', () => expect(ratioNote(10)).toContain('즐겁게'));
  it('high clay → mostly endured', () => expect(ratioNote(80)).toContain('버텨낸'));
});

describe('period.periodFilter', () => {
  it('day filter matches only that date', () => {
    const today = new Date(2026, 5, 24);
    const f = periodFilter('day', today);
    expect(f(entry('2026-06-24', 4, 0))).toBe(true);
    expect(f(entry('2026-06-23', 4, 0))).toBe(false);
  });
});

describe('insights notes', () => {
  it('goalNote 0 active days mentions goal', () => expect(goalNote(0, 0, 10)).toContain('목표'));
  it('goalNote high rate is encouraging', () => expect(goalNote(8, 9, 10)).toContain('단단'));
  it('histogramNote names the modal bucket', () => {
    expect(histogramNote([3, 0, 0, 0, 0, 1])).toContain('편하게 함');
  });
  it('weekendNote detects weekday-heavy', () => {
    const s = weekendNote({ weekdayAvg: 2, weekendAvg: 1, weekdayRes: 2, weekendRes: 2 });
    expect(s).toContain('평일');
  });
  it('projectionNote shows projected value', () => {
    const s = projectionNote({ projected: 30, elapsed: 10, total: 30, remaining: 20 }, 10, 'month');
    expect(s).toContain('약');
  });
  it('projectionNote year uses correct particle (올해는, not 올해은)', () => {
    const ongoing = projectionNote({ projected: 30, elapsed: 10, total: 365, remaining: 355 }, 10, 'year');
    expect(ongoing).toContain('올해는');
    expect(ongoing).not.toContain('올해은');
    const done = projectionNote({ projected: 30, elapsed: 365, total: 365, remaining: 0 }, 30, 'year');
    expect(done).toContain('올해를');
    expect(done).not.toContain('올해을');
  });
  it('projectionNote month keeps 이번 달은/을', () => {
    const s = projectionNote({ projected: 30, elapsed: 10, total: 30, remaining: 20 }, 10, 'month');
    expect(s).toContain('이번 달은');
  });
});

describe('stats.buildFlow', () => {
  it('day range yields 14 bars', () => {
    const today = new Date(2026, 5, 24);
    const flow = buildFlow([entry(toISODate(today), 4, 0)], COEF, today, 'day', 7);
    expect(flow.bars).toHaveLength(14);
    expect(flow.showMa).toBe(true);
  });
  it('month range yields 12 bars', () => {
    const today = new Date(2026, 5, 24);
    const flow = buildFlow([entry(toISODate(today), 4, 0)], COEF, today, 'month', 7);
    expect(flow.bars).toHaveLength(12);
  });
});

describe('stats.projection year', () => {
  it('extrapolates across the year', () => {
    const today = new Date(2026, 0, 2); // 2nd day of year
    const p = projection([entry('2026-01-01', 4, 0)], COEF, today, 'year');
    expect(p).not.toBeNull();
    expect(p!.total).toBe(365);
  });
});

describe('feed.buildFeed', () => {
  it('surfaces a streak insight and caps at 3', () => {
    const today = new Date(2026, 5, 24);
    const es = [
      entry(toISODate(today), 4, 0),
      entry(toISODate(addDays(today, -1)), 4, 0),
      entry(toISODate(addDays(today, -2)), 4, 0),
    ];
    const feed = buildFeed(es, CATS, COEF, today, 10);
    expect(feed.length).toBeGreaterThanOrEqual(1);
    expect(feed.length).toBeLessThanOrEqual(3);
    expect(feed.some((f) => f.text.includes('연속'))).toBe(true);
  });
  it('returns nothing without data', () => {
    expect(buildFeed([], CATS, COEF, new Date(2026, 5, 24), 10)).toEqual([]);
  });
});
