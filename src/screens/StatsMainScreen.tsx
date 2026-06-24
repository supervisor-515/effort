import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useStatsView } from '../statsView';
import { navigate } from '../router';
import { addDays, addMonths, f1, fmtHM, parseISODate, toISODate } from '../lib/format';
import { buildFlow, categoryStats, goalStats, periodStats, projection } from '../lib/stats';
import { periodFilter, ratioNote, RANGE_LABEL, RANGE_TITLE, recapLine } from '../lib/period';
import { goalNote, projectionNote } from '../lib/insights';
import { Card, EmptyState, ScreenHeader, SectionLabel } from '../components/ui';
import type { RangeKey } from '../types';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'day', label: '일' }, { key: 'week', label: '주' }, { key: 'month', label: '월' }, { key: 'year', label: '연' },
];

/** anchor 가 가리키는 기간이 today 의 기간과 같거나 그 이후인가(다음 이동 불가) */
function atLatestPeriod(anchor: Date, today: Date, range: RangeKey): boolean {
  if (range === 'month') {
    return anchor.getFullYear() > today.getFullYear()
      || (anchor.getFullYear() === today.getFullYear() && anchor.getMonth() >= today.getMonth());
  }
  if (range === 'year') return anchor.getFullYear() >= today.getFullYear();
  return toISODate(anchor) >= toISODate(today); // day, week
}

export function StatsMainScreen() {
  const { entries, categories, settings } = useStore();
  const coef = settings.resistanceCoef;
  const { today, range, anchor, setRange, setAnchor } = useStatsView();

  const [maWin, setMaWin] = useState<7 | 30>(7);
  const [selBar, setSelBar] = useState<number | null>(null);

  const atLatest = atLatestPeriod(anchor, today, range);

  const shift = (dir: -1 | 1) => {
    setSelBar(null);
    if (dir === 1 && atLatest) return;
    let next: Date;
    if (range === 'day') next = addDays(anchor, dir);
    else if (range === 'week') next = addDays(anchor, dir * 7);
    else if (range === 'month') next = addMonths(anchor, dir);
    else next = addMonths(anchor, dir * 12);
    if (next > today) next = today;
    setAnchor(next);
  };

  const pickDate = (iso: string) => {
    if (!iso) return;
    setSelBar(null);
    let d = parseISODate(iso);
    if (d > today) d = today;
    setAnchor(d);
  };

  const pickMonth = (value: string) => {
    if (!value) return; // 'YYYY-MM'
    const [y, m] = value.split('-').map(Number);
    setSelBar(null);
    let d = new Date(y, m - 1, 1);
    if (d > today) d = today;
    setAnchor(d);
  };

  const pickYear = (y: number) => {
    setSelBar(null);
    let d = new Date(y, 0, 1);
    if (d > today) d = today;
    setAnchor(d);
  };

  const changeRange = (r: RangeKey) => {
    setRange(r);
    setSelBar(null);
  };

  const earliestIso = useMemo(() => {
    if (entries.length === 0) return undefined;
    return entries.reduce((min, e) => (e.date < min ? e.date : min), entries[0].date);
  }, [entries]);

  // 연 선택용 연도 목록(최신 → 과거)
  const years = useMemo(() => {
    const start = earliestIso ? Number(earliestIso.slice(0, 4)) : today.getFullYear();
    const out: number[] = [];
    for (let y = today.getFullYear(); y >= start; y--) out.push(y);
    return out;
  }, [earliestIso, today]);

  const stats = useMemo(() => periodStats(entries, coef, anchor, range), [entries, coef, range, anchor]);
  const flow = useMemo(() => buildFlow(entries, coef, anchor, range, maWin), [entries, coef, range, maWin, anchor]);
  const goal = useMemo(
    () => (range === 'day' ? null : goalStats(entries, coef, settings.dailyGoal, periodFilter(range, anchor))),
    [entries, coef, settings.dailyGoal, range, anchor],
  );
  const proj = useMemo(
    () => ((range === 'month' || range === 'year') && atLatest ? projection(entries, coef, today, range) : null),
    [entries, coef, range, atLatest, today],
  );
  const cats = useMemo(
    () => categoryStats(entries, categories, coef, periodFilter(range, anchor)).filter((c) => c.effort > 0),
    [entries, categories, coef, range, anchor],
  );

  const hasAny = entries.length > 0;
  const byEffort = [...cats].sort((a, b) => b.effort - a.effort);
  const byClay = [...cats].sort((a, b) => b.clay - a.clay);
  const topCat = byEffort[0]?.name ?? '—';
  const topClayCat = byClay[0]?.name ?? '—';

  const ctot = cats.reduce((a, c) => a + c.effort, 0) || 1;
  const cmax = Math.max(...cats.map((c) => c.effort), 0.1);
  const catPreview = byEffort.slice(0, 4);

  const circ = 2 * Math.PI * 46;
  const joyLen = (circ * stats.joyPct) / 100;
  const clayLen = (circ * stats.clayPct) / 100;

  const flowSub = { day: '최근 14일 · 일별', week: '최근 12주 · 주별', month: '최근 12개월 · 월별', year: '연도별 누적' }[range];
  const maLabel = range === 'day' ? (maWin === 7 ? '7일 평균' : '30일 평균') : '추세선';
  const maPts = flow.ma.map((v, i) => `${i + 0.5},${(100 - (v / flow.maxT) * 100).toFixed(1)}`).join(' ');
  const anySel = selBar != null;
  const detail = selBar != null && flow.bars[selBar] ? flow.bars[selBar] : null;

  const delta = stats.deltaPct;
  const deltaStr = delta == null ? '—' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%`;
  const deltaCol = delta == null ? 'var(--ink-mute)' : delta >= 0 ? 'var(--olive)' : 'var(--clay)';
  const deltaSub = { day: '어제 대비', week: '지난주 대비', month: '지난달 대비', year: '작년 대비' }[range];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ScreenHeader title="통계" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        {/* 기간 토글 */}
        <div style={{ display: 'flex', background: 'var(--card-2)', borderRadius: "var(--r-card-sm)", padding: 4, gap: 3 }}>
          {RANGES.map((r) => {
            const a = range === r.key;
            return (
              <button key={r.key} onClick={() => changeRange(r.key)}
                style={{ flex: 1, border: 'none', borderRadius: 9, padding: '9px 0', font: '500 13px var(--font-sans)', cursor: 'pointer', background: a ? 'var(--ink)' : 'transparent', color: a ? 'var(--card)' : 'var(--ink-soft)', transition: 'all .2s' }}>
                {r.label}
              </button>
            );
          })}
        </div>

        {/* 기간 네비게이터: ‹ — 날짜(선택) — › */}
        {hasAny && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <button onClick={() => shift(-1)} aria-label="이전 기간" style={periodNavBtn}>‹</button>
            <div style={{ flex: 1, position: 'relative' }}>
              <button style={{ width: '100%', height: 40, borderRadius: "var(--r-card-sm)", border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', font: '500 14px var(--font-sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {RANGE_TITLE[range](anchor)}
                <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}>▾</span>
              </button>
              {(range === 'day' || range === 'week') && (
                <input
                  type="date"
                  value={toISODate(anchor)}
                  min={earliestIso}
                  max={toISODate(today)}
                  onChange={(e) => pickDate(e.target.value)}
                  aria-label="날짜 선택"
                  style={overlayInput}
                />
              )}
              {range === 'month' && (
                <input
                  type="month"
                  value={`${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`}
                  min={earliestIso?.slice(0, 7)}
                  max={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => pickMonth(e.target.value)}
                  aria-label="월 선택"
                  style={overlayInput}
                />
              )}
              {range === 'year' && (
                <select
                  value={anchor.getFullYear()}
                  onChange={(e) => pickYear(Number(e.target.value))}
                  aria-label="연도 선택"
                  style={overlayInput}
                >
                  {years.map((y) => <option key={y} value={y}>{y}년</option>)}
                </select>
              )}
            </div>
            <button onClick={() => shift(1)} disabled={atLatest} aria-label="다음 기간" style={{ ...periodNavBtn, opacity: atLatest ? 0.28 : 1, cursor: atLatest ? 'default' : 'pointer' }}>›</button>
          </div>
        )}

        {!hasAny ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState title="아직 기록이 쌓이는 중이에요" body="입력 탭에서 오늘 한 일을 적으면, 이곳에 흐름과 회고가 차곡차곡 그려져요. 설정에서 데모 데이터를 켜면 미리 둘러볼 수 있어요." />
          </div>
        ) : (
          <>
            {/* 요약 카드 */}
            <Card style={{ borderRadius: "var(--r-card)", padding: 20, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-soft)' }}>{RANGE_LABEL[range]} 노력량</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ font: '500 52px var(--font-serif)', lineHeight: 0.9, color: 'var(--ink)' }}>{f1(stats.total)}</span>
                    <span style={{ font: '400 15px var(--font-sans)', color: 'var(--ink-mute)' }}>점</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '500 14px var(--font-sans)', color: deltaCol }}>{deltaStr}</div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>{deltaSub}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <MiniStat value={fmtHM(stats.hours)} label="투입 시간" />
                <MiniStat value={f1(stats.avgRes)} label="평균 저항도" />
                <MiniStat value={`${stats.clayPct}%`} label="버텨낸 비율" color="var(--clay)" />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Chip>가장 많이 쌓인 <b style={{ color: 'var(--olive)', fontWeight: 600 }}>{topCat}</b></Chip>
                <Chip>가장 많이 버틴 <b style={{ color: 'var(--clay)', fontWeight: 600 }}>{topClayCat}</b></Chip>
                {goal && goal.activeDays > 0 && (
                  <Chip>목표 달성 <b style={{ color: 'var(--olive)', fontWeight: 600 }}>{goal.metDays}일</b> / {goal.activeDays}일</Chip>
                )}
              </div>
              {proj && (
                <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--olive-text)', background: 'var(--olive-subtle)', borderRadius: 10, padding: '9px 11px', marginTop: 12 }}>
                  {projectionNote(proj, stats.total, range as 'month' | 'year')}
                </div>
              )}
              {goal && (
                <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--ink-soft)', marginTop: 8 }}>
                  {goalNote(goal.metDays, goal.activeDays, goal.goal)}
                </div>
              )}
            </Card>

            {/* 한 줄 회고 */}
            <div style={{ background: 'var(--olive)', borderRadius: "var(--r-card)", padding: '18px 20px', marginTop: 12 }}>
              <div style={{ font: '700 12px var(--font-sans)', color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>{RANGE_LABEL[range]}의 회고</div>
              <div style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--card)' }}>{recapLine({ range, clayPct: stats.clayPct, deltaPct: stats.deltaPct, hasData: stats.hasData })}</div>
            </div>

            {/* 노력 흐름 */}
            <SectionLabel>노력의 흐름</SectionLabel>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-soft)' }}>{flowSub}</span>
                {flow.showMa && (
                  <div style={{ display: 'flex', background: 'var(--card-2)', borderRadius: 9, padding: 3, gap: 2 }}>
                    {([7, 30] as const).map((w) => (
                      <button key={w} onClick={() => setMaWin(w)} style={{ border: 'none', borderRadius: 7, padding: '5px 10px', font: '500 11px var(--font-sans)', cursor: 'pointer', background: maWin === w ? 'var(--ink)' : 'transparent', color: maWin === w ? 'var(--card)' : 'var(--ink-soft)' }}>{w}일 평균</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative', height: 150 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%' }}>
                  {flow.bars.map((b, i) => {
                    const fr = b.total / flow.maxT;
                    const jf = b.total > 0 ? b.joy / b.total : 0;
                    const sel = selBar === i;
                    return (
                      <button key={i} onClick={() => setSelBar(sel ? null : i)}
                        aria-label={`${b.label || `${i + 1}번째`} · ${b.body}`} aria-pressed={sel}
                        style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'pointer', opacity: anySel ? (sel ? 1 : 0.4) : 1, transition: 'opacity .3s', border: 'none', background: 'transparent', padding: 0 }}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', border: `1.5px solid ${sel ? 'var(--ink)' : 'transparent'}` }}>
                          <div style={{ height: `${(fr * (1 - jf) * 100).toFixed(1)}%`, background: 'var(--clay)', transition: 'height .5s cubic-bezier(.2,.8,.3,1)' }} />
                          <div style={{ height: `${(fr * jf * 100).toFixed(1)}%`, background: 'var(--olive)', transition: 'height .5s cubic-bezier(.2,.8,.3,1)' }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox={`0 0 ${flow.bars.length} 100`} preserveAspectRatio="none">
                  <polyline points={maPts} fill="none" stroke="var(--ink)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" opacity={0.65} />
                </svg>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {flow.bars.map((b, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', font: '400 9px var(--font-sans)', color: 'var(--ink-mute)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{b.label}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, alignItems: 'center' }}>
                <LegendDot color="var(--olive)" label="즐겁게" />
                <LegendDot color="var(--clay)" label="버텨냄" />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: '400 11.5px var(--font-sans)', color: 'var(--ink-soft)', marginLeft: 'auto' }}>
                  <span style={{ width: 14, height: 2, background: 'var(--ink)', opacity: 0.65 }} />{maLabel}
                </span>
              </div>
              {detail && (
                <div style={{ marginTop: 14, background: 'var(--card-2)', borderRadius: "var(--r-card-sm)", padding: '13px 15px', animation: 'slideIn .3s ease' }}>
                  <div style={{ font: '500 13px var(--font-sans)', color: 'var(--ink)', marginBottom: 4 }}>{detail.label || `#${selBar! + 1}`}</div>
                  <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--ink-soft)' }}>{detail.body}</div>
                </div>
              )}
              <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 10, textAlign: 'center' }}>막대를 탭하면 자세한 요약이 열려요</div>
            </Card>

            {/* 즐겁게 vs 버텨냄 */}
            <SectionLabel>즐겁게 한 노력 vs 버텨낸 노력</SectionLabel>
            <Card>
              {stats.hasData ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ position: 'relative', width: 108, height: 108, flex: 'none' }}>
                    <svg width={108} height={108} viewBox="0 0 108 108">
                      <circle cx={54} cy={54} r={46} fill="none" stroke="var(--card-2)" strokeWidth={14} />
                      <circle cx={54} cy={54} r={46} fill="none" stroke="var(--olive)" strokeWidth={14} strokeDasharray={`${joyLen} 999`} transform="rotate(-90 54 54)" />
                      <circle cx={54} cy={54} r={46} fill="none" stroke="var(--clay)" strokeWidth={14} strokeDasharray={`${clayLen} 999`} strokeDashoffset={-joyLen} transform="rotate(-90 54 54)" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ font: '500 24px var(--font-serif)', color: 'var(--clay)' }}>{stats.clayPct}%</span>
                      <span style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>버텨냄</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <RatioRow color="var(--olive)" label="즐겁게 한 노력" pct={stats.joyPct} />
                    <RatioRow color="var(--clay)" label="버텨낸 노력" pct={stats.clayPct} />
                    <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--clay-accent)', background: 'var(--card-2)', borderRadius: 10, padding: '9px 11px', marginTop: 4 }}>{ratioNote(stats.clayPct)}</div>
                  </div>
                </div>
              ) : (
                <div style={{ font: '400 13px/1.6 var(--font-sans)', color: 'var(--ink-mute)', textAlign: 'center', padding: '14px 0' }}>이 기간엔 기록이 없어요.</div>
              )}
              <button onClick={() => navigate('#/stats/resistance')} style={linkBtn}>저항 분석 자세히 보기 ›</button>
            </Card>

            {/* 카테고리 프리뷰 */}
            <SectionLabel>어디에 노력이 쌓였나</SectionLabel>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {catPreview.map((c) => (
                  <div key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, font: '400 12px var(--font-sans)', color: 'var(--ink-soft)' }}>
                      <span style={{ color: c.color, fontWeight: 500 }}>{c.name}</span>
                      <span style={{ color: 'var(--ink-mute)' }}>{f1(c.effort)}점 · {Math.round((c.effort / ctot) * 100)}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: 'var(--card-2)', overflow: 'hidden' }}>
                      <div style={{ width: `${((c.effort / cmax) * 100).toFixed(1)}%`, height: '100%', background: c.color, borderRadius: 99, transition: 'width .5s' }} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('#/stats/category')} style={linkBtn}>카테고리 분석 자세히 보기 ›</button>
            </Card>

            {/* 리포트/아카이브/달력 진입 */}
            <SectionLabel>돌아보기</SectionLabel>
            <div style={{ display: 'flex', gap: 10 }}>
              <EnterCard onClick={() => navigate('#/stats/report')} big={`${today.getMonth() + 1}월`} sub="노력 리포트 ›" />
              <EnterCard onClick={() => navigate('#/stats/archive')} big="기록" sub="최고기록 아카이브 ›" />
            </div>
            <button onClick={() => navigate('#/stats/calendar')} style={{ ...linkBtn, marginTop: 10, height: 48 }}>
              노력 달력 — 한 해의 흐름을 잔디로 보기 ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--card-2)', borderRadius: "var(--r-card-sm)", padding: 12 }}>
      <div style={{ font: '500 18px var(--font-serif)', color: color ?? 'var(--ink)' }}>{value}</div>
      <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--card-2)', borderRadius: 99, padding: '7px 12px', font: '400 12px var(--font-sans)', color: 'var(--ink-soft)' }}>{children}</span>;
}
function LegendDot({ color, label }: { color: string; label: string }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: '400 11.5px var(--font-sans)', color: 'var(--ink-soft)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />{label}</span>;
}
function RatioRow({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span style={{ font: '400 13px var(--font-sans)', color: 'var(--ink-soft)', flex: 1 }}>{label}</span>
      <span style={{ font: '500 14px var(--font-serif)', color: 'var(--ink)' }}>{pct}%</span>
    </div>
  );
}
function EnterCard({ onClick, big, sub }: { onClick: () => void; big: string; sub: string }) {
  return (
    <button onClick={onClick} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: "var(--r-card)", padding: '18px 14px', textAlign: 'left', cursor: 'pointer', boxShadow: 'var(--shadow-raised)' }}>
      <div style={{ font: '500 26px var(--font-serif)', color: 'var(--ink)' }}>{big}</div>
      <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-soft)', marginTop: 4 }}>{sub}</div>
    </button>
  );
}

const overlayInput: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  opacity: 0, cursor: 'pointer', border: 'none', background: 'transparent',
};

const periodNavBtn: React.CSSProperties = {
  width: 40, height: 40, flex: 'none', borderRadius: "var(--r-card-sm)", border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 18, cursor: 'pointer',
};

const linkBtn: React.CSSProperties = {
  width: '100%', marginTop: 14, height: 42, borderRadius: "var(--r-card-sm)", border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink-soft)', font: '500 13px var(--font-sans)', cursor: 'pointer',
};
