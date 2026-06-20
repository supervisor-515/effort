import { useMemo } from 'react';
import { useStore } from '../store';
import { f1, mix } from '../lib/format';
import { aggregateByDay } from '../lib/score';
import { daySeries, dowResistance, heatmap } from '../lib/stats';
import { BackHeader, Card, EmptyState } from '../components/ui';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const resColor = (v: number) => mix('#6F7252', '#C07B53', (v - 1) / 3.2);

export function ResistanceScreen() {
  const { entries, settings } = useStore();
  const coef = settings.resistanceCoef;
  const today = startOfToday();

  const data = useMemo(() => {
    const series70 = daySeries(entries, coef, today, 70);
    const map = aggregateByDay(entries, coef);
    const avgResRange = (slice: typeof series70) => {
      let s = 0, c = 0;
      for (const d of slice) { s += d.resSum; c += d.count; }
      return c ? s / c : 0;
    };
    // 최근 10주 평균 저항
    const weekRes: number[] = [];
    for (let w = 9; w >= 0; w--) {
      const slice = series70.slice((9 - w) * 7, (9 - w) * 7 + 7);
      weekRes.push(avgResRange(slice));
    }
    const last7 = series70.slice(-7);
    const prev7 = series70.slice(-14, -7);
    const recRes = avgResRange(last7);
    const recPrevRes = avgResRange(prev7);
    const l7t = last7.reduce((a, d) => a + d.total, 0);
    const l7clay = last7.reduce((a, d) => a + d.clay, 0);
    const recClay = l7t ? Math.round((l7clay / l7t) * 100) : 0;

    // 6개월 즐겁게/버텨냄
    const ratioMonths: { label: string; joyH: number; clayH: number }[] = [];
    for (let mo = 5; mo >= 0; mo--) {
      const dt = new Date(today.getFullYear(), today.getMonth() - mo, 1);
      const grp = [...map.values()].filter((d) => {
        const x = new Date(d.date);
        return x.getFullYear() === dt.getFullYear() && x.getMonth() === dt.getMonth();
      });
      const t = grp.reduce((a, d) => a + d.total, 0) || 1;
      const cl = grp.reduce((a, d) => a + d.clay, 0) / t;
      ratioMonths.push({ label: `${dt.getMonth() + 1}월`, joyH: (1 - cl) * 100, clayH: cl * 100 });
    }

    const dow = dowResistance(entries);
    const dwMaxI = dow.indexOf(Math.max(...dow));
    const heat = heatmap(entries);
    const heatHas = heat.some((row) => row.some((c) => c.has));
    return { weekRes, recRes, recPrevRes, recClay, ratioMonths, dow, dwMaxI, heat, heatHas };
  }, [entries, coef, today]);

  if (entries.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <BackHeader title="저항 분석" sub="하기 싫었던 순간의 리듬" />
        <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
          <EmptyState title="저항의 흐름은 아직이에요" body="기록이 쌓이면 요일·시간대별로 어떤 순간을 버텼는지 보여드릴게요." />
        </div>
      </div>
    );
  }

  const wrMax = Math.max(...data.weekRes, 0.1);
  const resUp = data.recRes > data.recPrevRes;
  const recoveryNote = resUp
    ? '최근 7일은 노력량은 유지됐지만 평균 저항도가 높아졌어요. 이번 주는 작은 일부터 가볍게 쌓아도 충분해요.'
    : '최근 7일은 저항이 한결 가벼워졌어요. 지금 리듬을 부드럽게 이어가 보세요.';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BackHeader title="저항 분석" sub="하기 싫었던 순간의 리듬" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        {/* 평균 저항도 변화 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)' }}>평균 저항도 변화</span>
            <span style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)' }}>최근 10주</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 96, marginTop: 16 }}>
            {data.weekRes.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ width: '100%', height: `${(v / wrMax * 100).toFixed(1)}%`, background: resColor(v), borderRadius: 4, minHeight: 4, transition: 'height .5s' }} />
              </div>
            ))}
          </div>
          <Note>{resUp ? '최근으로 올수록 평균 저항이 조금씩 높아졌어요. 해내고는 있지만, 더 힘겹게 버티는 흐름입니다.' : '최근 들어 평균 저항이 완만해졌어요. 한결 수월하게 쌓고 있어요.'}</Note>
        </Card>

        {/* 회복 신호 */}
        <div style={{ background: '#EFE3D6', border: '1px solid #E3D2BF', borderRadius: 20, padding: 18, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--clay)' }} />
            <span style={{ font: '600 13px var(--font-sans)', color: 'var(--clay-accent)' }}>회복이 필요한 신호</span>
          </div>
          <div style={{ font: '400 14px/1.6 var(--font-sans)', color: '#6B5A48' }}>{recoveryNote}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <RecCell value={f1(data.recRes)} label="최근7일 평균저항" color="var(--clay)" />
            <RecCell value={f1(data.recPrevRes)} label="직전7일 평균저항" color="var(--olive)" />
            <RecCell value={`${data.recClay}%`} label="버텨낸 비율" color="var(--ink)" />
          </div>
        </div>

        {/* 6개월 즐겁게/버텨냄 */}
        <Card style={{ marginTop: 14 }}>
          <div style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)' }}>즐겁게 vs 버텨냄, 6개월 변화</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 16 }}>
            {data.ratioMonths.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{ width: '100%', height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: `${m.clayH.toFixed(1)}%`, background: 'var(--clay)', transition: 'height .5s' }} />
                  <div style={{ height: `${m.joyH.toFixed(1)}%`, background: 'var(--olive)', transition: 'height .5s' }} />
                </div>
                <span style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>{m.label}</span>
              </div>
            ))}
          </div>
          <div style={{ font: '400 12px/1.5 var(--font-sans)', color: '#8B8270', marginTop: 12 }}>달마다 버텨낸 노력의 비중이 어떻게 움직였는지 보여줘요. 막대 위쪽(클레이)이 두꺼울수록 더 많이 버틴 달이에요.</div>
        </Card>

        {/* 요일별 저항도 */}
        <Card style={{ marginTop: 14 }}>
          <div style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)' }}>요일별 평균 저항도</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 96, marginTop: 16 }}>
            {data.dow.map((v, i) => {
              const txc = i === data.dwMaxI ? 'var(--clay)' : 'var(--ink-mute)';
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, justifyContent: 'flex-end', height: '100%' }}>
                  <span style={{ font: '500 11px var(--font-serif)', color: txc }}>{f1(v)}</span>
                  <div style={{ width: '100%', height: `${(v / 5 * 100).toFixed(1)}%`, background: resColor(v), borderRadius: 5, minHeight: 4, transition: 'height .5s' }} />
                  <span style={{ font: '400 11px var(--font-sans)', color: txc }}>{DOW[i]}</span>
                </div>
              );
            })}
          </div>
          <Note>{DOW[data.dwMaxI]}요일의 시작 저항이 가장 높아요. 가장 가벼웠던 요일과 견주어 리듬을 살펴보세요.</Note>
        </Card>

        {/* 시간대 히트맵 */}
        <Card style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)' }}>요일 × 시간대</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>
              편함<span style={{ width: 10, height: 10, borderRadius: 3, background: '#6F7252' }} /><span style={{ width: 10, height: 10, borderRadius: 3, background: '#C49B6A' }} /><span style={{ width: 10, height: 10, borderRadius: 3, background: '#C07B53' }} />버팀
            </span>
          </div>
          {data.heatHas ? (
            <>
              <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 5, font: '400 10px var(--font-sans)', color: 'var(--ink-mute)', paddingTop: 18 }}>
                  <span>새벽</span><span>오전</span><span>오후</span><span>저녁</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 5 }}>
                    {DOW.map((n) => <div key={n} style={{ textAlign: 'center', font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>{n}</div>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
                    {data.heat.flatMap((row, b) => row.map((cell, d) => (
                      <div key={`${b}-${d}`} style={{ aspectRatio: '1', borderRadius: 4, background: cell.has ? mix('#6F7252', '#C07B53', (cell.avg - 0.5) / 4) : '#EFE8DA' }} />
                    )))}
                  </div>
                </div>
              </div>
              <div style={{ font: '400 12px/1.5 var(--font-sans)', color: '#8B8270', marginTop: 14 }}>색이 진한 칸일수록 그 시간대에 더 버텼다는 뜻이에요. 옅은 칸은 편안하게 흘러간 시간대예요.</div>
            </>
          ) : (
            <div style={{ font: '400 12px/1.6 var(--font-sans)', color: 'var(--ink-mute)', marginTop: 14 }}>시간대 정보가 있는 기록이 아직 적어요. 항목을 추가하면 칸이 채워져요.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--clay-accent)', background: 'var(--card-2)', borderRadius: 10, padding: '10px 12px', marginTop: 14 }}>{children}</div>;
}
function RecCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ flex: 1, background: '#FBF6EE', borderRadius: 11, padding: 11 }}>
      <div style={{ font: '500 16px var(--font-serif)', color }}>{value}</div>
      <div style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
