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

/** 회고 주어 — 현재 기간이면 현재형, 과거 기간을 보고 있으면 회상형 */
const SUBJ_CURRENT: Record<RangeKey, string> = { day: '오늘은', week: '이번 주는', month: '이번 달은', year: '올해는' };
const SUBJ_PAST: Record<RangeKey, string> = { day: '그날은', week: '그 주는', month: '그달은', year: '그 해는' };

export function recapLine(p: {
  range: RangeKey;
  clayPct: number;
  deltaPct: number | null;
  hasData: boolean;
  isCurrent?: boolean;
}): string {
  if (!p.hasData) return '아직 기록이 쌓이는 중이에요. 한 줄씩 적어가다 보면 흐름이 보여요.';
  const t = (p.isCurrent === false ? SUBJ_PAST : SUBJ_CURRENT)[p.range];
  const c = p.clayPct;

  // 분해 방식 변경(저항 비율 배분)에 맞춘 임계값: clayPct ≈ 20 × 평균 저항.
  // 35→avgRes 1.75, 52→2.6, 68→3.4 기준.
  let body: string;
  if (p.range === 'year') {
    body = c <= 55
      ? `${t} 천천히, 그러나 분명히 쌓였어요.`
      : `${t} 버텨낸 시간이 많았어요. 그만큼 단단해졌어요.`;
  } else if (c <= 35) {
    body = `${t} 즐겁게 한 노력이 중심이었어요. 무리 없이 가볍게 흘러갔어요.`;
  } else if (c <= 52) {
    body = `${t} 즐겁게 한 노력과 버텨낸 노력이 고르게 섞였어요.`;
  } else if (c <= 68) {
    body = `${t} 빠르게 달렸다기보다, 하기 싫은 순간을 여러 번 넘긴 시간이었어요.`;
  } else {
    body = `${t} 버텨낸 노력이 대부분이었어요. 힘든 걸 정말 많이 넘겼어요.`;
  }

  // 변화가 뚜렷하면 한 마디 덧붙임 (연 단위 제외)
  let tail = '';
  if (p.deltaPct != null && Math.abs(p.deltaPct) >= 15 && p.range !== 'year') {
    const prev = { day: '어제', week: '지난주', month: '지난달', year: '작년' }[p.range];
    tail = p.deltaPct > 0
      ? ` ${prev}보다 노력량이 ${p.deltaPct}% 늘었어요.`
      : ` ${prev}보다 ${Math.abs(p.deltaPct)}% 줄었지만, 이어간 것만으로 충분해요.`;
  }
  return body + tail;
}

/** 즐겁게 vs 버텨냄 비율 코멘트 — 회고(recapLine)가 '무슨 일이 있었나'를 서술한다면,
 *  이건 '그래서 어떻게 하면 좋은가'를 짚는 조언형. 임계값은 clayPct ≈ 20×평균 저항 기준. */
export function ratioNote(clayPct: number): string {
  if (clayPct <= 25) return '거의 다 즐겁게 한 노력이었어요. 가끔 살짝 어려운 일에 손대면 성장 폭이 커져요.';
  if (clayPct <= 44) return '즐겁게 한 노력이 흐름을 이끌었어요. 무리 없이 오래 지속하기 좋은 균형이에요.';
  if (clayPct <= 56) return '즐거움과 버팀이 균형을 이뤘어요. 지금 리듬이 가장 오래가는 페이스예요.';
  if (clayPct <= 72) return '버텨낸 노력의 비중이 컸어요. 잘 해내고 있지만, 의식적으로 쉬어가는 날도 챙겨주세요.';
  return '대부분이 버텨낸 노력이었어요. 무리가 쌓이지 않게 가벼운 날을 한두 번 끼워보세요.';
}
