import type { Entry, RangeKey } from '../types';
import { addDays, parseISODate, toISODate } from './format';

/** 현재 기간에 속하는 항목인지 판별하는 필터 */
export function periodFilter(range: RangeKey, today: Date): (e: Entry) => boolean {
  if (range === 'day') {
    const iso = toISODate(today);
    return (e) => e.date === iso;
  }
  if (range === 'week') {
    const from = toISODate(addDays(today, -6));
    const to = toISODate(today);
    return (e) => e.date >= from && e.date <= to;
  }
  if (range === 'month') {
    return (e) => {
      const d = parseISODate(e.date);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    };
  }
  return (e) => parseISODate(e.date).getFullYear() === today.getFullYear();
}

export const RANGE_TITLE: Record<RangeKey, (today: Date) => string> = {
  day: (t) => `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일`,
  week: (t) => {
    const from = addDays(t, -6);
    return `${from.getMonth() + 1}월 ${from.getDate()}일 – ${t.getMonth() + 1}월 ${t.getDate()}일`;
  },
  month: (t) => `${t.getFullYear()}년 ${t.getMonth() + 1}월`,
  year: (t) => `${t.getFullYear()}년`,
};

export const RANGE_LABEL: Record<RangeKey, string> = { day: '오늘', week: '이번 주', month: '이번 달', year: '올해' };

export function recapLine(range: RangeKey, clayPct: number, hasData: boolean): string {
  if (!hasData) return '아직 기록이 쌓이는 중이에요. 한 줄씩 적어가다 보면 흐름이 보여요.';
  const heavy = clayPct >= 42;
  if (range === 'day') {
    return heavy
      ? '오늘은 버텨낸 노력이 많았던 하루였어요. 잘 넘겼습니다.'
      : '오늘은 비교적 편하게 흘러간 하루였어요.';
  }
  if (range === 'week') {
    return heavy
      ? '이번 주는 하기 싫은 순간을 여러 번 넘긴 한 주였어요.'
      : '최근 7일은 큰 폭발보다 일정하게 쌓은 흐름이에요.';
  }
  if (range === 'year') {
    return '1년 동안 천천히, 그러나 분명히 쌓였어요.';
  }
  return heavy
    ? '이번 달은 빠르게 달린 달이라기보다, 하기 싫은 순간을 여러 번 넘긴 달이에요.'
    : '이번 달은 즐겁게 한 노력이 흐름을 이끈 달이에요.';
}
