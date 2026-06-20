import type { Resistance } from '../types';

/** 소수 1자리 문자열 */
export const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);

/** 시간(h) → "N시간 M분" */
export function fmtHM(h: number): string {
  const m = Math.round(h * 60);
  const H = Math.floor(m / 60);
  const M = m % 60;
  if (H === 0 && M === 0) return '0분';
  if (H === 0) return `${M}분`;
  return M ? `${H}시간 ${M}분` : `${H}시간`;
}

export const RES_WORDS = [
  '편하게 함',
  '살짝 귀찮음',
  '미루고 싶었음',
  '하기 싫었음',
  '진짜 버팀',
  '나를 이김',
] as const;

export const resWord = (r: number): string => RES_WORDS[r] ?? '';

/** 두 hex 색을 t(0~1)로 섞어 rgb() 문자열 */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const A = p(a);
  const B = p(b);
  const tt = Math.max(0, Math.min(1, t));
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * tt));
  return `rgb(${c.join(',')})`;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** Date → 'YYYY-MM-DD' (로컬) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const dowName = (d: Date): string => DOW[d.getDay()];

/** '6월 20일 토요일' */
export function fullDateLabel(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${dowName(d)}요일`;
}

/** '6월 20일' */
export function shortDateLabel(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function relDateLabel(offset: number): string {
  if (offset === 0) return '오늘';
  if (offset === 1) return '어제';
  if (offset === 2) return '그저께';
  return `${offset}일 전`;
}

export type { Resistance };
