import type { Category, Entry } from '../types';
import { f1 } from './format';
import { categoryStats, dowResistance, goalStats, periodStats, streaks } from './stats';
import { periodFilter } from './period';

export type Feed = { tone: 'olive' | 'clay' | 'neutral'; text: string };

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** 통계 메인 상단에 띄울 자동 회고 2~3개. 데이터가 있는 것만 우선순위대로. */
export function buildFeed(entries: Entry[], categories: Category[], coef: number, today: Date, goal: number): Feed[] {
  if (entries.length === 0) return [];
  const out: Feed[] = [];

  // 1) 연속 기록
  const { current, max } = streaks(entries, today);
  if (current >= 3) {
    out.push(current >= max && max >= 5
      ? { tone: 'clay', text: `${current}일 연속 기록 — 최장 기록을 새로 쓰는 중이에요. 🔥` }
      : { tone: 'olive', text: `오늘까지 ${current}일 연속으로 이어가고 있어요.` });
  }

  // 2) 이번 주 vs 지난주
  const wk = periodStats(entries, coef, today, 'week');
  if (wk.deltaPct != null && Math.abs(wk.deltaPct) >= 15) {
    out.push(wk.deltaPct > 0
      ? { tone: 'olive', text: `이번 주 노력량이 지난주보다 ${wk.deltaPct}% 늘었어요.` }
      : { tone: 'neutral', text: `이번 주는 지난주보다 ${Math.abs(wk.deltaPct)}% 적어요. 가볍게 쉬어가도 좋아요.` });
  }

  // 3) 이번 주 목표 달성
  if (goal > 0) {
    const g = goalStats(entries, coef, goal, periodFilter('week', today));
    if (g.metDays >= 2) out.push({ tone: 'olive', text: `이번 주 ${g.metDays}일이나 하루 목표(${f1(goal)}점)를 넘겼어요.` });
  }

  // 4) 이번 달 가장 많이 버틴 영역
  const cats = categoryStats(entries, categories, coef, periodFilter('month', today)).filter((c) => c.clay > 0);
  if (cats.length > 0) {
    const top = [...cats].sort((a, b) => b.clay - a.clay)[0];
    out.push({ tone: 'clay', text: `이번 달은 ‘${top.name}’에서 가장 많이 버텼어요(버텨낸 노력 ${f1(top.clay)}점).` });
  }

  // 5) 저항이 가장 높은 요일
  const dow = dowResistance(entries);
  const active = dow.filter((v) => v > 0);
  if (active.length >= 4) {
    let maxI = 0;
    for (let i = 1; i < dow.length; i++) if (dow[i] > dow[maxI]) maxI = i;
    if (dow[maxI] >= 2.5) out.push({ tone: 'neutral', text: `${DOW[maxI]}요일에 저항이 가장 높아요(평균 ${f1(dow[maxI])}). 그날은 작게 시작해보세요.` });
  }

  return out.slice(0, 3);
}
