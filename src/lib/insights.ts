import { f1, josa, TIME_BANDS } from './format';
import { density as densityOf } from './stats';
import type { CatStat, Projection, WeekendSplit } from './stats';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const BANDS = TIME_BANDS;

// ───────────── 저항 분석 ─────────────

/** 평균 저항도 변화 코멘트 — 최근7일 vs 직전7일 차이 크기로 5단계 */
export function resistanceTrendNote(rec: number, prev: number): string {
  const d = rec - prev;
  const a = f1(rec);
  const b = f1(prev);
  if (d >= 0.6) return `최근 2주 사이 평균 저항이 ${b}→${a}로 뚜렷이 올랐어요. 해내고는 있지만 더 힘겹게 버티는 흐름이에요.`;
  if (d >= 0.2) return `평균 저항이 ${b}→${a}로 조금 올랐어요. 무리한 신호는 아니지만 페이스를 살펴보면 좋아요.`;
  if (d <= -0.6) return `평균 저항이 ${b}→${a}로 크게 낮아졌어요. 한결 수월하게 쌓고 있어요.`;
  if (d <= -0.2) return `평균 저항이 ${b}→${a}로 한결 가벼워졌어요.`;
  return `평균 저항이 ${a} 안팎으로 비슷하게 유지되고 있어요.`;
}

export function recoveryHeading(rec: number, prev: number): string {
  return rec - prev >= 0.2 ? '회복이 필요한 신호' : '지금의 리듬';
}

/** 회복 신호 코멘트 — 4단계 */
export function recoveryNote(rec: number, prev: number): string {
  const d = rec - prev;
  const a = f1(rec);
  const b = f1(prev);
  if (d >= 0.6) return `최근 7일 평균 저항이 직전 7일보다 많이 높아졌어요(${b}→${a}). 이번 주는 작은 일부터 가볍게 쌓아도 충분해요.`;
  if (d >= 0.2) return `최근 7일 저항이 살짝 올랐어요(${b}→${a}). 버거운 날은 의식적으로 쉬어가도 좋아요.`;
  if (d <= -0.2) return `최근 7일은 저항이 한결 가벼워졌어요(${b}→${a}). 회복이 잘 되고 있어요.`;
  return `최근 7일은 직전과 비슷한 저항을 유지했어요(평균 ${a}). 지금 리듬을 부드럽게 이어가 보세요.`;
}

/** 요일별 저항 — 가장 높은/낮은 요일과 값 */
export function dowNote(dow: number[]): string {
  const idx = dow.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
  if (idx.length < 2) return '아직 요일별 패턴을 보기엔 기록이 적어요. 며칠 더 쌓이면 또렷해져요.';
  const max = idx.reduce((a, b) => (b.v > a.v ? b : a));
  const min = idx.reduce((a, b) => (b.v < a.v ? b : a));
  return `${DOW[max.i]}요일이 평균 저항 ${f1(max.v)}로 가장 높고, ${DOW[min.i]}요일이 ${f1(min.v)}로 가장 가벼워요.`;
}

/** 6개월 즐겁게/버텨냄 변화 — 첫 달 대비 마지막 달 버텨낸 비율 추세 */
export function sixMonthNote(months: { clayPct: number; has: boolean }[]): string {
  const valid = months.filter((m) => m.has);
  if (valid.length < 2) return '몇 달 더 쌓이면 장기 흐름이 또렷하게 보여요.';
  const first = valid[0].clayPct;
  const last = valid[valid.length - 1].clayPct;
  const d = last - first;
  if (d >= 8) return `버텨낸 노력의 비중이 ${first}%→${last}%로 점점 커졌어요. 노력량은 비슷해도 체감 저항이 높아지는 흐름이에요.`;
  if (d <= -8) return `버텨낸 노력의 비중이 ${first}%→${last}%로 줄며 한결 가벼워졌어요. 흐름이 부드러워지고 있어요.`;
  return `버텨낸 노력의 비중이 ${last}% 안팎으로 꾸준히 유지됐어요. 기복 없이 이어가는 중이에요.`;
}

/** 요일×시간대 히트맵 — 가장 진한(많이 버틴) 칸 */
export function heatNote(heat: { avg: number; has: boolean }[][]): string {
  let best: { band: number; dow: number; avg: number } | null = null;
  for (let b = 0; b < heat.length; b++) {
    for (let d = 0; d < heat[b].length; d++) {
      const cell = heat[b][d];
      if (cell.has && (!best || cell.avg > best.avg)) best = { band: b, dow: d, avg: cell.avg };
    }
  }
  if (!best) return '시간대 정보가 있는 기록이 아직 적어요.';
  return `${DOW[best.dow]}요일 ${BANDS[best.band]} 시간대에 가장 많이 버텼어요(평균 저항 ${f1(best.avg)}). 옅은 칸은 편하게 흘러간 시간대예요.`;
}

// ───────────── 카테고리 분석 ─────────────

/** 카테고리 인사이트 — 사분면(시간×저항) + 실제 수치 기반 */
export function categoryInsight(c: CatStat, ctx: { maxHours: number; isTop: boolean }): string {
  const timeHigh = c.hours >= ctx.maxHours * 0.5;
  const resHigh = c.avgRes >= 2.5;
  const avg = f1(c.avgRes);
  const clayP = Math.round(c.clayRatio * 100);
  const dens = densityOf(c.effort, c.hours);

  let body: string;
  if (timeHigh && resHigh) {
    body = `시간도 저항도 높은 ‘성장 영역’이에요. 평균 저항 ${avg}에 버텨낸 비율 ${clayP}%로, 힘든 걸 가장 많이 넘긴 곳이에요.`;
  } else if (timeHigh && !resHigh) {
    body = `시간을 많이 들였지만 저항은 낮은 ‘잘 맞는 루틴’이에요(평균 저항 ${avg}). 꾸준함이 강점이에요.`;
  } else if (!timeHigh && resHigh) {
    body = `시간은 적지만 저항이 높은 ‘미루는 영역’이에요(평균 ${avg}). 작게 쪼개 진입장벽을 낮추면 좋아요.`;
  } else {
    body = `짧고 가볍게 이어가는 영역이에요(평균 ${avg}). 회복과 환기에 도움이 돼요.`;
  }
  if (dens >= 1.7 && !(timeHigh && resHigh)) {
    body += ` 시간당 ${f1(dens)}점으로 밀도 있게 집중했어요.`;
  }
  return ctx.isTop ? `이번 흐름에서 가장 많이 쌓인 영역이에요. ${body}` : body;
}

// ───────────── 페이스 예측 ─────────────

/** 예상치 vs 현재 누적 코멘트 */
export function projectionNote(p: Projection, current: number, range: 'month' | 'year'): string {
  const unit = range === 'month' ? '이번 달' : '올해';
  if (p.remaining <= 0) return `${unit}${josa(unit, '을', '를')} 마무리했어요. 최종 ${f1(current)}점이에요.`;
  return `지금 페이스라면 ${unit}${josa(unit, '은', '는')} 약 ${f1(p.projected)}점으로 마무리될 것 같아요. (남은 ${p.remaining}일 · 현재 ${f1(current)}점)`;
}

// ───────────── 일일 목표 ─────────────

export function goalNote(metDays: number, activeDays: number, goal: number): string {
  if (activeDays === 0) return `하루 목표는 ${goal}점이에요. 기록이 쌓이면 달성한 날을 세어드려요.`;
  const rate = Math.round((metDays / activeDays) * 100);
  // 표본이 너무 적으면(2일 이하) 단정하지 않고 담백하게
  if (activeDays <= 2) return `기록한 ${activeDays}일 중 ${metDays}일이 목표(${goal}점)를 넘겼어요.`;
  if (rate >= 80) return `기록한 ${activeDays}일 중 ${metDays}일을 목표(${goal}점) 이상 달성했어요. 흐름이 아주 단단해요.`;
  if (rate >= 50) return `기록한 ${activeDays}일 중 ${metDays}일이 목표(${goal}점)를 넘겼어요. 절반 넘게 채웠어요.`;
  if (metDays > 0) return `${metDays}일이 목표(${goal}점)를 넘겼어요. 목표를 살짝 낮춰 더 자주 닿게 해도 좋아요.`;
  return `아직 목표(${goal}점)를 넘긴 날은 없어요. 목표가 버겁다면 설정에서 낮춰보세요.`;
}

// ───────────── 저항도 분포 ─────────────

export function histogramNote(count: number[]): string {
  const total = count.reduce((a, b) => a + b, 0);
  if (total === 0) return '아직 분포를 볼 기록이 적어요.';
  let maxI = 0;
  for (let i = 1; i < count.length; i++) if (count[i] > count[maxI]) maxI = i;
  const RES = ['편하게 함', '살짝 귀찮음', '미루고 싶었음', '하기 싫었음', '진짜 버팀', '나를 이김'];
  const pct = Math.round((count[maxI] / total) * 100);
  const heavyPct = Math.round(((count[3] + count[4] + count[5]) / total) * 100);
  return `‘${RES[maxI]}’(저항 ${maxI}) 항목이 ${pct}%로 가장 많아요. 저항 3 이상인 항목은 전체의 ${heavyPct}%예요.`;
}

// ───────────── 평일 vs 주말 ─────────────

export function weekendNote(s: WeekendSplit): string {
  const wd = f1(s.weekdayAvg);
  const we = f1(s.weekendAvg);
  // 한쪽에 기록이 없으면 비교가 아니라 안내로
  if (s.weekdayAvg > 0 && s.weekendAvg === 0) return `아직 주말 기록이 없어요. 평일엔 하루 평균 ${wd}점을 쌓고 있어요.`;
  if (s.weekendAvg > 0 && s.weekdayAvg === 0) return `아직 평일 기록이 없어요. 주말엔 하루 평균 ${we}점을 쌓고 있어요.`;
  if (s.weekdayAvg === 0 && s.weekendAvg === 0) return '평일·주말 비교는 기록이 더 쌓이면 보여드려요.';
  if (s.weekdayAvg >= s.weekendAvg * 1.25) return `평일 하루 평균 ${wd}점으로 주말(${we}점)보다 활발해요. 평일에 더 많이 쌓는 편이에요.`;
  if (s.weekendAvg >= s.weekdayAvg * 1.25) return `주말 하루 평균 ${we}점으로 평일(${wd}점)보다 높아요. 주말에 더 몰아서 하는 편이에요.`;
  return `평일 ${wd}점, 주말 ${we}점으로 큰 차이 없이 고르게 이어가고 있어요.`;
}
