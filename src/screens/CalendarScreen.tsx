import { useMemo } from 'react';
import { useStore } from '../store';
import { useStatsView } from '../statsView';
import { f1, fmtHM, parseISODate, shortDateLabel } from '../lib/format';
import { calendarGrid, lifetimeTotals, streaks } from '../lib/stats';
import { BackHeader, Card, EmptyState, StatTriple } from '../components/ui';
import type { CalLevel } from '../lib/stats';

const DOW = ['', '월', '', '수', '', '금', ''];
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// 레벨 0~4 색 (빈 칸 → 올리브 점점 진하게)
const LEVEL_BG = (lv: CalLevel): string => {
  if (lv === 0) return 'var(--card-2)';
  const alpha = [0, 0.3, 0.5, 0.72, 1][lv];
  return `color-mix(in srgb, var(--olive) ${Math.round(alpha * 100)}%, var(--card-2))`;
};

export function CalendarScreen() {
  const { entries, settings } = useStore();
  const coef = settings.resistanceCoef;
  const { anchor: today } = useStatsView();

  const grid = useMemo(() => calendarGrid(entries, coef, today, 53), [entries, coef, today]);
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

  // 월 라벨: 각 열(주)의 첫 칸이 속한 달이 바뀌는 지점에 표시
  const monthLabels = grid.map((col, i) => {
    const m = parseISODate(col[0].date).getMonth();
    const prevM = i > 0 ? parseISODate(grid[i - 1][0].date).getMonth() : -1;
    return m !== prevM ? MONTHS[m] : '';
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BackHeader title="노력 달력" sub="한 해의 흐름을 한눈에" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        <Card>
          <div style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)', marginBottom: 4 }}>지난 1년의 노력</div>
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-soft)', marginBottom: 14 }}>
            칸 하나가 하루예요. 색이 진할수록 그날 노력이 많이 쌓였어요.
          </div>

          {/* 그리드: 가로 스크롤 가능 */}
          <div className="scr" style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: '100%' }}>
              {/* 월 라벨 줄 */}
              <div style={{ display: 'flex', gap: 3, paddingLeft: 18 }}>
                {monthLabels.map((m, i) => (
                  <div key={i} style={{ width: 9, font: '400 9px var(--font-sans)', color: 'var(--ink-mute)', textAlign: 'left', whiteSpace: 'nowrap' }}>{m}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {/* 요일 라벨 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 2 }}>
                  {DOW.map((d, i) => (
                    <div key={i} style={{ height: 9, width: 12, font: '400 8px var(--font-sans)', color: 'var(--ink-mute)', lineHeight: '9px' }}>{d}</div>
                  ))}
                </div>
                {/* 주 열 */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {grid.map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {col.map((cell, ri) => (
                        <div
                          key={ri}
                          title={cell.future ? '' : `${shortDateLabel(parseISODate(cell.date))} · ${f1(cell.total)}점`}
                          aria-label={cell.future ? undefined : `${cell.date} ${f1(cell.total)}점`}
                          style={{
                            width: 9, height: 9, borderRadius: 2,
                            background: cell.future ? 'transparent' : LEVEL_BG(cell.level),
                            border: cell.future ? 'none' : '1px solid color-mix(in srgb, var(--ink) 6%, transparent)',
                          }}
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
              <span key={lv} style={{ width: 10, height: 10, borderRadius: 2, background: LEVEL_BG(lv), border: '1px solid color-mix(in srgb, var(--ink) 6%, transparent)' }} />
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
