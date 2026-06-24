import { useMemo } from 'react';
import { useStore } from '../store';
import { useStatsView } from '../statsView';
import { navigate } from '../router';
import { f1, fmtHM, parseISODate, shortDateLabel, toISODate } from '../lib/format';
import { lifetimeTotals, monthCalendars, streaks } from '../lib/stats';
import { BackHeader, Card, EmptyState, StatTriple } from '../components/ui';
import type { CalLevel, MonthCell } from '../lib/stats';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const LEVEL_OPACITY = [0, 0.28, 0.5, 0.72, 1];

function DayCell({ cell, isToday, onOpen }: { cell: MonthCell; isToday: boolean; onOpen: (iso: string) => void }) {
  const overlay = (
    <span style={{ position: 'absolute', inset: 0, background: 'var(--olive)', opacity: LEVEL_OPACITY[cell.level], borderRadius: 6 }} />
  );
  const numColor = cell.future ? 'var(--ink-mute)' : cell.level >= 3 ? 'var(--card)' : 'var(--ink-soft)';
  const num = (
    <span style={{ position: 'relative', font: `${isToday ? 700 : 400} 11px var(--font-sans)`, color: numColor }}>{cell.day}</span>
  );
  const base: React.CSSProperties = {
    position: 'relative', aspectRatio: '1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--card-2)', overflow: 'hidden',
    border: isToday ? '1.5px solid var(--ink)' : cell.met ? '1.5px solid var(--clay)' : '1px solid var(--line-2)',
    boxShadow: cell.met && !isToday ? 'inset 0 0 0 1px var(--clay)' : undefined,
  };
  if (cell.future) {
    return <div style={{ ...base, opacity: 0.4 }}>{overlay}{num}</div>;
  }
  return (
    <button
      onClick={() => onOpen(cell.date)}
      title={`${shortDateLabel(parseISODate(cell.date))} · ${f1(cell.total)}점${cell.met ? ' · 목표 달성' : ''}`}
      aria-label={`${cell.date} ${f1(cell.total)}점${cell.met ? ', 목표 달성' : ''}`}
      style={{ ...base, padding: 0, cursor: 'pointer' }}
    >
      {overlay}{num}
    </button>
  );
}

export function CalendarScreen() {
  const { entries, settings } = useStore();
  const coef = settings.resistanceCoef;
  const { today } = useStatsView();

  const blocks = useMemo(() => monthCalendars(entries, coef, today, 12, settings.dailyGoal), [entries, coef, today, settings.dailyGoal]);
  const life = useMemo(() => lifetimeTotals(entries, coef), [entries, coef]);
  const streak = useMemo(() => streaks(entries, today), [entries, today]);

  if (entries.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <BackHeader title="노력 달력" sub="한 해의 흐름을 한눈에" />
        <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
          <EmptyState title="달력이 아직 비어 있어요" body="기록이 쌓이면 하루하루가 색으로 채워져, 한 달 한 달의 노력이 달력으로 보여요." />
        </div>
      </div>
    );
  }

  const todayIso = toISODate(today);
  const openDay = (iso: string) => navigate(`#/input/${iso}`);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BackHeader title="노력 달력" sub="한 달 한 달의 흐름" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        {/* 누적 요약 */}
        <div style={{ marginBottom: 14 }}>
          <StatTriple items={[
            { value: `${life.activeDays}일`, label: '기록한 날' },
            { value: `${streak.current}일`, label: '현재 연속', color: 'var(--clay)' },
            { value: `${streak.max}일`, label: '최장 연속', color: 'var(--olive)' },
          ]} />
        </div>

        <Card>
          <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--ink-soft)', marginBottom: 12 }}>
            칸이 진할수록 그날 노력이 많았어요. <span style={{ color: 'var(--clay-accent)' }}>주황 테두리</span>는 목표 달성일. 날짜를 누르면 그날 기록으로 가요.
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
            {WEEKDAYS.map((w, i) => (
              <div key={w} style={{ textAlign: 'center', font: '500 10px var(--font-sans)', color: i === 0 ? 'var(--clay-accent)' : 'var(--ink-mute)' }}>{w}</div>
            ))}
          </div>

          {/* 월별 달력 (최신 달 위) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {blocks.map((b) => (
              <div key={`${b.year}-${b.month}`}>
                <div style={{ font: '600 13px var(--font-sans)', color: 'var(--ink)', marginBottom: 8 }}>
                  {b.year}년 {b.month + 1}월
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                  {Array.from({ length: b.firstDow }).map((_, i) => <div key={`b${i}`} />)}
                  {b.cells.map((c) => (
                    <DayCell key={c.date} cell={c} isToday={c.date === todayIso} onOpen={openDay} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 범례 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'flex-end' }}>
            <span style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>적음</span>
            {([0, 1, 2, 3, 4] as CalLevel[]).map((lv) => (
              <span key={lv} style={{ position: 'relative', width: 13, height: 13, borderRadius: 4, background: 'var(--card-2)', border: '1px solid var(--line-2)', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', inset: 0, background: 'var(--olive)', opacity: LEVEL_OPACITY[lv] }} />
              </span>
            ))}
            <span style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>많음</span>
          </div>
        </Card>

        {/* 전체 누적 */}
        <div style={{ marginTop: 14 }}>
          <StatTriple items={[
            { value: f1(life.effort), label: '전체 노력량' },
            { value: fmtHM(life.hours), label: '전체 시간' },
            { value: `${life.entries}개`, label: '전체 항목' },
          ]} />
        </div>
        {life.firstDate && (
          <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--ink-mute)', textAlign: 'center', marginTop: 14 }}>
            {shortDateLabel(parseISODate(life.firstDate))}부터 묵묵히 쌓아온 기록이에요.
          </div>
        )}
      </div>
    </div>
  );
}
