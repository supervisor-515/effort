import type { Category, Entry, Resistance } from '../types';
import { addDays, toISODate } from './format';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'study', name: '공부', color: '#6F7252' },
  { id: 'exercise', name: '운동', color: '#C07B53' },
  { id: 'work', name: '일', color: '#5E7184' },
  { id: 'house', name: '집안일', color: '#A98B6A' },
  { id: 'relation', name: '관계', color: '#9B6B8E' },
  { id: 'hobby', name: '취미', color: '#8A9B6B' },
  { id: 'recover', name: '회복', color: '#7FA0A0' },
];

/** 새 카테고리에 자동 배정할 팔레트 */
export const CATEGORY_PALETTE = ['#7E8B57', '#A9743E', '#4F7C7A', '#9B6B8E', '#B58A3C'];

// 결정적 PRNG (프로토타입과 동일)
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Profile = {
  id: string;
  texts: string[];
  baseH: number;
  freq: number;
  resMean: number;
  resSp: number;
  hour: number;
};

// 프로파일은 프로토타입의 수치 톤(공부=가장 많이 쌓임, 운동=가장 많이 버팀,
// 취미=가장 편하게 이어감, 버텨낸 비율 ~42%, 평균 저항 ~2.8)을 재현하도록 튜닝됨.
const PROFILES: Profile[] = [
  { id: 'study', texts: ['알고리즘 문제 풀이', '영어 단어 암기', '강의 듣고 정리', '책 한 챕터 읽기'], baseH: 1.25, freq: 0.66, resMean: 2.2, resSp: 1.0, hour: 20 },
  { id: 'exercise', texts: ['아침 러닝 5km', '헬스장 다녀옴', '홈트 30분', '저녁 산책'], baseH: 0.8, freq: 0.55, resMean: 4.0, resSp: 0.7, hour: 7 },
  { id: 'work', texts: ['업무 처리', '회의 준비', '문서 작성', '프로젝트 진행'], baseH: 1.0, freq: 0.55, resMean: 1.9, resSp: 1.0, hour: 14 },
  { id: 'house', texts: ['설거지와 청소', '빨래 정리', '장보기', '방 정리'], baseH: 0.5, freq: 0.45, resMean: 2.3, resSp: 1.0, hour: 19 },
  { id: 'relation', texts: ['친구와 통화', '가족과 저녁', '약속 다녀옴', '안부 연락'], baseH: 0.8, freq: 0.4, resMean: 1.2, resSp: 0.9, hour: 21 },
  { id: 'hobby', texts: ['좋아하는 팟캐스트 들으며 산책', '그림 그리기', '게임 한 판', '음악 감상'], baseH: 0.95, freq: 0.5, resMean: 0.7, resSp: 0.6, hour: 22 },
  { id: 'recover', texts: ['낮잠과 휴식', '명상 10분', '따뜻한 차 한 잔', '일찍 잠자리'], baseH: 0.55, freq: 0.38, resMean: 1.1, resSp: 0.6, hour: 15 },
];

/** 자정으로 맞춘 '오늘' */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 데모용 1년치 샘플 항목 생성. 기본 anchor = 실제 '오늘'(데모가 항상 현재처럼 보이도록). */
export function generateDemoEntries(anchor: Date = startOfToday()): Entry[] {
  const rng = mulberry32(424242);
  const g = () => rng() + rng() + rng() - 1.5;
  const dowRes = [-0.2, 0.95, 0.15, 0.4, -0.55, -0.05, -0.3];
  const dowFreq = [0.78, 1.0, 1.0, 1.05, 1.18, 1.0, 0.76];
  const raw: Entry[] = [];
  let seq = 0;

  for (let i = 364; i >= 0; i--) {
    const d = addDays(anchor, -i);
    const dow = d.getDay();
    const phase = (364 - i) / 364;
    const recent = i < 7;
    for (const p of PROFILES) {
      if (rng() > p.freq * dowFreq[dow] * (0.85 + phase * 0.3)) continue;
      let hours = p.baseH * (0.55 + rng() * 1.0) * (0.9 + phase * 0.25);
      hours = Math.max(0.25, Math.round(hours * 4) / 4);
      let res = p.resMean + g() * p.resSp + dowRes[dow] + (recent ? 0.4 : 0);
      res = Math.max(0, Math.min(5, Math.round(res)));
      let hour = p.hour + Math.round((rng() - 0.5) * 5);
      hour = Math.max(0, Math.min(23, hour));
      const texts = p.texts;
      raw.push({
        id: `demo-${seq++}`,
        date: toISODate(d),
        text: texts[Math.floor(rng() * texts.length)],
        units: Math.round(hours / 0.25),
        resistance: res as Resistance,
        categoryId: p.id,
        hour,
      });
    }
  }

  // 이번 달 총 투입시간이 ~68.5시간이 되도록 units 를 전체 스케일(수치 톤 맞춤)
  const month = anchor.getMonth();
  const year = anchor.getFullYear();
  const juneHours = raw
    .filter((e) => {
      const [y, m] = e.date.split('-').map(Number);
      return y === year && m - 1 === month;
    })
    .reduce((a, e) => a + e.units * 0.25, 0);
  const scale = juneHours > 0 ? 68.5 / juneHours : 1;
  if (Math.abs(scale - 1) > 0.01) {
    for (const e of raw) e.units = Math.max(1, Math.round(e.units * scale));
  }

  return raw;
}
