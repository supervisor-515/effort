import { describe, it, expect } from 'vitest';
import type { Category, Entry, Resistance } from '../types';
import { toISODate, addDays } from './format';
import { entryEffort, entryHours, joyPart, clayPart, aggregateByDay } from './score';
import {
  daySeries, periodStats, streaks, goalStats, resistanceHistogram,
  weekendSplit, projection, calendarGrid, lifetimeTotals, toCSV, density,
} from './stats';

const COEF = 0.3;

function entry(date: string, units: number, resistance: Resistance, categoryId = 'study'): Entry {
  return { id: `${date}-${units}-${resistance}`, date, text: 't', units, resistance, categoryId };
}

const CATS: Category[] = [
  { id: 'study', name: '공부', color: '#000' },
  { id: 'exercise', name: '운동', color: '#111' },
];

describe('score', () => {
  it('entryHours = units * 0.25', () => {
    expect(entryHours(entry('2026-06-01', 4, 0))).toBe(1);
    expect(entryHours(entry('2026-06-01', 2, 0))).toBe(0.5);
  });

  it('entryEffort = hours * (1 + resistance*coef)', () => {
    expect(entryEffort(entry('2026-06-01', 4, 0), COEF)).toBeCloseTo(1.0);
    expect(entryEffort(entry('2026-06-01', 4, 5), COEF)).toBeCloseTo(2.5);
  });

  it('joyPart/clayPart split effort by resistance ratio and sum to effort', () => {
    const e0 = entry('d', 4, 0); // 저항 0 → 전부 즐거움
    expect(joyPart(e0, COEF)).toBeCloseTo(1.0);
    expect(clayPart(e0, COEF)).toBeCloseTo(0);
    const e5 = entry('d', 4, 5); // 저항 5(MAX) → 전부 버팀
    expect(joyPart(e5, COEF)).toBeCloseTo(0);
    expect(clayPart(e5, COEF)).toBeCloseTo(2.5);
    const e3 = entry('d', 4, 3); // 저항 3 → 60% 버팀 / 40% 즐거움
    const eff3 = entryEffort(e3, COEF);
    expect(clayPart(e3, COEF)).toBeCloseTo(eff3 * 0.6);
    expect(joyPart(e3, COEF)).toBeCloseTo(eff3 * 0.4);
    expect(joyPart(e3, COEF) + clayPart(e3, COEF)).toBeCloseTo(eff3);
  });

  it('density', () => {
    expect(density(5, 2)).toBe(2.5);
    expect(density(5, 0)).toBe(0);
  });
});

describe('aggregateByDay', () => {
  it('sums joy/clay/hours per day', () => {
    const es = [entry('2026-06-01', 4, 0), entry('2026-06-01', 4, 5)];
    const map = aggregateByDay(es, COEF);
    const d = map.get('2026-06-01')!;
    expect(d.count).toBe(2);
    expect(d.hours).toBe(2);
    expect(d.joy).toBeCloseTo(1.0);
    expect(d.clay).toBeCloseTo(2.5);
    expect(d.resAvg).toBeCloseTo(2.5);
  });
});

describe('daySeries', () => {
  it('returns count consecutive days ending today, oldest first', () => {
    const today = new Date(2026, 5, 24);
    const es = [entry(toISODate(today), 4, 0)];
    const s = daySeries(es, COEF, today, 7);
    expect(s).toHaveLength(7);
    expect(s[6].date).toBe(toISODate(today));
    expect(s[6].total).toBeCloseTo(1.0);
    expect(s[0].total).toBe(0);
  });
});

describe('streaks', () => {
  it('current counts back from today; max is longest run', () => {
    const today = new Date(2026, 5, 24);
    const es = [
      entry(toISODate(today), 4, 0),
      entry(toISODate(addDays(today, -1)), 4, 0),
      entry(toISODate(addDays(today, -2)), 4, 0),
      // gap at -3
      entry(toISODate(addDays(today, -5)), 4, 0),
    ];
    const { current, max } = streaks(es, today);
    expect(current).toBe(3);
    expect(max).toBe(3);
  });

  it('current is 0 when neither today nor yesterday recorded', () => {
    const today = new Date(2026, 5, 24);
    const es = [entry(toISODate(addDays(today, -3)), 4, 0)];
    expect(streaks(es, today).current).toBe(0);
  });
});

describe('goalStats', () => {
  it('counts days meeting the goal', () => {
    const es = [
      entry('2026-06-01', 4, 5), // effort 2.5
      entry('2026-06-01', 40, 0), // +10 → day total 12.5 ≥ 10
      entry('2026-06-02', 4, 0), // 1.0 < 10
    ];
    const g = goalStats(es, COEF, 10, () => true);
    expect(g.activeDays).toBe(2);
    expect(g.metDays).toBe(1);
  });
});

describe('resistanceHistogram', () => {
  it('buckets by resistance level', () => {
    const es = [entry('d', 4, 0), entry('d', 4, 0), entry('d', 4, 5)];
    const h = resistanceHistogram(es, COEF);
    expect(h.count[0]).toBe(2);
    expect(h.count[5]).toBe(1);
    expect(h.effort[5]).toBeCloseTo(2.5);
  });
});

describe('weekendSplit', () => {
  it('separates weekday vs weekend daily averages', () => {
    // 2026-06-20 is Saturday, 2026-06-22 is Monday
    const es = [entry('2026-06-20', 8, 0), entry('2026-06-22', 4, 0)];
    const s = weekendSplit(es, COEF);
    expect(s.weekendAvg).toBeCloseTo(2.0); // 8 units → 2h → 2.0 effort
    expect(s.weekdayAvg).toBeCloseTo(1.0);
  });
});

describe('projection', () => {
  it('extrapolates month total from elapsed days', () => {
    const today = new Date(2026, 5, 10); // June 10, 30-day month
    const es = [entry('2026-06-05', 4, 0)]; // total 1.0 in 10 elapsed days
    const p = projection(es, COEF, today, 'month')!;
    expect(p.total).toBe(30);
    expect(p.elapsed).toBe(10);
    expect(p.projected).toBeCloseTo(3.0); // 1.0/10 * 30
  });

  it('returns null with no data', () => {
    expect(projection([], COEF, new Date(2026, 5, 10), 'month')).toBeNull();
  });
});

describe('calendarGrid', () => {
  it('builds weeks x 7 grid ending at current week', () => {
    const today = new Date(2026, 5, 24);
    const grid = calendarGrid([entry(toISODate(today), 4, 0)], COEF, today, 4);
    expect(grid).toHaveLength(4);
    expect(grid.every((col) => col.length === 7)).toBe(true);
    const flat = grid.flat();
    const todayCell = flat.find((c) => c.date === toISODate(today))!;
    expect(todayCell.level).toBe(4); // only nonzero day → max
    expect(todayCell.future).toBe(false);
  });
});

describe('lifetimeTotals', () => {
  it('aggregates totals and earliest date', () => {
    const es = [entry('2026-06-02', 4, 0), entry('2026-06-01', 4, 5), entry('2026-06-01', 4, 0)];
    const l = lifetimeTotals(es, COEF);
    expect(l.entries).toBe(3);
    expect(l.activeDays).toBe(2);
    expect(l.firstDate).toBe('2026-06-01');
    expect(l.hours).toBeCloseTo(3);
  });

  it('handles empty', () => {
    expect(lifetimeTotals([], COEF).firstDate).toBeNull();
  });
});

describe('toCSV', () => {
  it('produces header + sorted rows, escaping commas', () => {
    const es = [
      { id: '1', date: '2026-06-02', text: 'a,b', units: 4, resistance: 0 as Resistance, categoryId: 'study' },
      { id: '2', date: '2026-06-01', text: 'plain', units: 4, resistance: 5 as Resistance, categoryId: 'exercise' },
    ];
    const csv = toCSV(es, CATS, COEF);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,category,text,hours,resistance,effort');
    expect(lines[1].startsWith('2026-06-01,운동,plain,1.00,5,2.50')).toBe(true);
    expect(lines[2]).toContain('"a,b"');
  });
});

describe('periodStats', () => {
  it('computes delta vs previous day', () => {
    const today = new Date(2026, 5, 24);
    const es = [
      entry(toISODate(today), 8, 0), // 2.0
      entry(toISODate(addDays(today, -1)), 4, 0), // 1.0
    ];
    const s = periodStats(es, COEF, today, 'day');
    expect(s.total).toBeCloseTo(2.0);
    expect(s.deltaPct).toBe(100);
    expect(s.hasData).toBe(true);
  });

  it('clayPct reflects buried effort share', () => {
    const today = new Date(2026, 5, 24);
    const es = [entry(toISODate(today), 4, 0), entry(toISODate(today), 4, 5)];
    const s = periodStats(es, COEF, today, 'day');
    // joy 1.0, clay 2.5, total 3.5 → clayPct ~71
    expect(s.clayPct).toBe(71);
    expect(s.joyPct).toBe(29);
  });

  it('mid resistance splits proportionally (res 3 → 60% clay)', () => {
    const today = new Date(2026, 5, 24);
    const s = periodStats([entry(toISODate(today), 4, 3)], COEF, today, 'day');
    expect(s.clayPct).toBe(60);
    expect(s.joyPct).toBe(40);
  });
});
