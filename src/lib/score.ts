import type { Entry } from '../types';

/** 항목 투입시간(h) = units * 0.25 */
export const entryHours = (e: Entry): number => e.units * 0.25;

/** 항목 노력량 = 투입시간 * (1 + resistance * coef) */
export const entryEffort = (e: Entry, coef: number): number =>
  entryHours(e) * (1 + e.resistance * coef);

/** 저항도 척도의 최대값. 노력량을 즐거움/버팀으로 비율 배분할 때의 기준. */
export const MAX_RESISTANCE = 5;

/** 버팀 성분: 항목 노력량 × (저항/MAX). 저항 0이면 0, MAX면 노력량 전체. */
export const clayPart = (e: Entry, coef: number): number =>
  entryEffort(e, coef) * (e.resistance / MAX_RESISTANCE);

/** 즐거움 성분: 항목 노력량 × (1 - 저항/MAX). joyPart + clayPart === entryEffort. */
export const joyPart = (e: Entry, coef: number): number =>
  entryEffort(e, coef) * (1 - e.resistance / MAX_RESISTANCE);

export type DayAgg = {
  date: string;
  total: number; // 노력량 합
  hours: number; // 투입시간 합
  joy: number; // 즐겁게 한 노력량
  clay: number; // 버텨낸 노력량
  resSum: number;
  count: number;
  resAvg: number;
  entries: Entry[];
};

/** 날짜별 집계 맵 */
export function aggregateByDay(entries: Entry[], coef: number): Map<string, DayAgg> {
  const map = new Map<string, DayAgg>();
  for (const e of entries) {
    let d = map.get(e.date);
    if (!d) {
      d = { date: e.date, total: 0, hours: 0, joy: 0, clay: 0, resSum: 0, count: 0, resAvg: 0, entries: [] };
      map.set(e.date, d);
    }
    const eff = entryEffort(e, coef);
    d.total += eff;
    d.hours += entryHours(e);
    d.joy += joyPart(e, coef);
    d.clay += clayPart(e, coef);
    d.resSum += e.resistance;
    d.count += 1;
    d.entries.push(e);
  }
  for (const d of map.values()) d.resAvg = d.count ? d.resSum / d.count : 0;
  return map;
}
