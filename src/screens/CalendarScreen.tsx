import { useMemo } from 'react';
import { useStore } from '../store';
import { useStatsView } from '../statsView';
import { navigate } from '../router';
import { f1, fmtHM, parseISODate, shortDateLabel, toISODate } from '../lib/format';
import { calendarGrid, lifetimeTotals, streaks } from '../lib/stats';
import { BackHeader, Card, EmptyState, StatTriple } from '../components/ui';
import type { CalLevel } from '../lib/stats';

const DOW = ['', '월', '', '수', '', '금', ''];
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// 레벨 0~4 → 올리브 불투명도(테마 변수를 그대로 써서 라이트/다크 모두 안전)
const LEVEL_OPACITY = [0, 0.28, 0.5, 0.72, 1];

/** 한 칸: card-2 바탕 위에 올리브 오버레이. 목표 달성일엔 링. */
function Cell({ level, future, met, title, onClick }: {
  level: CalLevel; future: boolean; met: boolean; title: string; onClick?: () => void;
}) {
  const inner = (
    <span style={{ position: 'absolute', inset: 0, background: 'var(--olive)', opacity: LEVEL_OPACITY[level], borderRadius: 2 }} />
  );
  const ring = met ? { boxShadow: 'inset 0 0 0 1.5px var(--clay)' } : undefined;
  if (future) {
    return <span style={{ width: 10, height: 10, borderRadius: 2, background: 'transparent' }} />;
  }
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        position: 'relative', width: 10, height: 10, borderRadius: 2, padding: 0, cursor: 'pointer',
        background: 'var(--card-2)', border: '1px solid var(--line-2)', overflow: 'hidden', ...ring,
      }}
    >
      {inner}
    </button>
  );
}

export function CalendarScreen() {
  const { entries, settings } = useStore();
  const coef = settings.resistanceCoef;
  const { today } = useStatsView();

  const grid = useMemo(() => calendarGrid(entries, coef, today, 53, settings.dailyGoal), [entries, coef, today, settings.dailyGoal]);
  const life = useMemo(() => lifetimeTotals(entries, coef), [entries, coef]);
  const streak = useMemo(() => streaks(entries, today), [entries, today]);

  if (entries.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <BackHeader title="노력 달력" sub="한 해의 흐름을 한눈에" />
        <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
          <EmptyState title="달력이 아직 비어 있어요" body="기록이 쌓이면 하루하루가 색으로 채워져, 한 해의 노력이 잔디처럼 보여요." />
        </div>
      </div>
    );
  }

  const todayIso = toISODate(today);

  // 월 라벨: 각 열(주)의 첫 칸이 속한 달이 바뀌는 지점에 표시
  const monthLabels = grid.map((col, i) => {
    const m = parseISODate(col[0].date).getMonth();
    const prevM = i > 0 ? parseISODate(grid[i - 1][0].date).getMonth() : -1;
    return m !== prevM ? MONTHS[m] : '';
  });

  const openDay = (iso: string) => navigate(`#/input/${iso}`);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BackHeader title="노력 달력" sub="한 해의 흐름을 한눈에" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        <Card>
          <div style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)', marginBottom: 4 }}>지난 1년의 노력</div>
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-soft)', marginBottom: 14 }}>
            칸 하나가 하루예요. 색이 진할수록 노력이 많이 쌓였고, <span style={{ color: 'var(--clay-accent)' }}>테두리</span>는 목표 달성일이에요. 칸을 탭하면 그날 기록으로 가요.
          </div>

          {/* 그리드: 가로 스크롤 가능 */}
          <div className="scr" style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: '100%' }}>
              {/* 월 라벨 줄 */}
              <div style={{ display: 'flex', gap: 3, paddingLeft: 16 }}>
                {monthLabels.map((m, i) => (
                  <div key={i} style={{ width: 10, font: '400 9px var(--font-sans)', color: 'var(--ink-mute)', textAlign: 'left', whiteSpace: 'nowrap' }}>{m}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {/* 요일 라벨 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 2 }}>
                  {DOW.map((d, i) => (
                    <div key={i} style={{ height: 10, width: 12, font: '400 8px var(--font-sans)', color: 'var(--ink-mute)', lineHeight: '10px' }}>{d}</div>
                  ))}
                </div>
                {/* 주 열 */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {grid.map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {col.map((cell, ri) => (
                        <Cell
                          key={ri}
                          level={cell.level}
                          future={cell.future}
                          met={cell.met}
                          title={cell.date === todayIso ? `오늘 · ${f1(cell.total)}점` : `${shortDateLabel(parseISODate(cell.date))} · ${f1(cell.total)}점`}
                          onClick={() => openDay(cell.date)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 범례 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'flex-end' }}>
            <span style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>적음</span>
            {([0, 1, 2, 3, 4] as CalLevel[]).map((lv) => (
              <span key={lv} style={{ position: 'relative', width: 11, height: 11, borderRadius: 2, background: 'var(--card-2)', border: '1px solid var(--line-2)', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', inset: 0, background: 'var(--olive)', opacity: LEVEL_OPACITY[lv] }} />
              </span>
            ))}
            <span style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>많음</span>
          </div>
        </Card>

        {/* 누적 요약 */}
        <div style={{ marginTop: 14 }}>
          <StatTriple items={[
            { value: `${life.activeDays}일`, label: '기록한 날' },
            { value: `${streak.current}일`, label: '현재 연속', color: 'var(--clay)' },
            { value: `${streak.max}일`, label: '최장 연속', color: 'var(--olive)' },
          ]} />
        </div>
        <div style={{ marginTop: 10 }}>
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
