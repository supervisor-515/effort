import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { f1, fmtHM } from '../lib/format';
import { categoryStats } from '../lib/stats';
import { categoryInsight } from '../lib/insights';
import { BackHeader, Card, EmptyState, SectionLabel } from '../components/ui';

export function CategoryScreen() {
  const { entries, categories, settings } = useStore();
  const coef = settings.resistanceCoef;

  const cats = useMemo(
    () => categoryStats(entries, categories, coef).filter((c) => c.effort > 0),
    [entries, categories, coef],
  );
  const [selId, setSelId] = useState<string | null>(null);

  if (cats.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <BackHeader title="카테고리 분석" sub="어디에 쌓고, 어디서 버텼나" />
        <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
          <EmptyState title="카테고리 흐름은 아직이에요" body="항목을 기록하면 어디에 노력이 쌓이고 어디서 버텼는지 보여드릴게요." />
        </div>
      </div>
    );
  }

  const byEffort = [...cats].sort((a, b) => b.effort - a.effort);
  const byGrowth = [...cats].sort((a, b) => b.growth - a.growth);
  const cMax = Math.max(...cats.map((c) => c.effort), 0.1);
  const maxH = Math.max(...cats.map((c) => c.hours), 0.1);
  const maxEff = Math.max(...cats.map((c) => c.effort), 0.1);
  const topId = byEffort[0]?.id;
  const sel = cats.find((c) => c.id === selId) ?? cats[0];
  const selInsight = categoryInsight(sel, { maxHours: maxH, isTop: sel.id === topId });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BackHeader title="카테고리 분석" sub="어디에 쌓고, 어디서 버텼나" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        {/* 누적 노력량 */}
        <Card>
          <div style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)', marginBottom: 16 }}>카테고리별 누적 노력량</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {byEffort.map((c) => {
              const w = (c.effort / cMax) * 100;
              const cr = c.clayRatio;
              return (
                <div key={c.id} onClick={() => setSelId(c.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: '500 13px var(--font-sans)', color: 'var(--ink)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.name}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)' }}>{fmtHM(c.hours)}</span>
                      <span style={{ background: c.avgRes >= 3 ? '#F0DDCF' : '#E7EADD', color: c.avgRes >= 3 ? 'var(--clay-accent)' : 'var(--olive)', borderRadius: 99, padding: '3px 8px', font: '500 10.5px var(--font-sans)' }}>저항 {f1(c.avgRes)}</span>
                    </span>
                  </div>
                  <div style={{ height: 10, borderRadius: 99, background: '#F0EADE', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(w * (1 - cr)).toFixed(1)}%`, height: '100%', background: c.color }} />
                    <div style={{ width: `${(w * cr).toFixed(1)}%`, height: '100%', background: c.color, opacity: 0.45 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, font: '400 10.5px var(--font-sans)', color: '#B4AB98' }}>
                    <span>{f1(c.effort)}점</span><span>버텨낸 비율 {Math.round(cr * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {selId && (
            <div style={{ marginTop: 16, background: 'var(--card-2)', borderRadius: 12, padding: '13px 15px', animation: 'slideIn .3s ease' }}>
              <div style={{ font: '500 13px var(--font-sans)', color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: sel.color }} />{sel.name}
              </div>
              <div style={{ font: '400 12px/1.5 var(--font-sans)', color: '#8B6F4E' }}>{selInsight}</div>
            </div>
          )}
        </Card>

        {/* 성장 점수 랭킹 */}
        <SectionLabel>성장 점수 랭킹 · 저항을 뚫고 쌓은 노력</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byGrowth.slice(0, 5).map((c, i) => {
            const first = i === 0;
            return (
              <div key={c.id} style={{ background: 'var(--card)', border: `1px solid ${first ? '#D8C3A8' : 'var(--line)'}`, borderRadius: first ? 20 : 16, padding: first ? '20px 18px' : '15px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(90,70,35,.05)' }}>
                <div style={{ font: `500 ${first ? 26 : 19}px var(--font-serif)`, color: first ? 'var(--clay)' : '#C3B9A4', width: 28, textAlign: 'center', flex: 'none' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `500 ${first ? 18 : 15}px var(--font-sans)`, color: 'var(--ink)' }}>{c.name}</div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 3 }}>평균 저항 {f1(c.avgRes)} · {fmtHM(c.hours)}</div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ font: `500 ${first ? 26 : 20}px var(--font-serif)`, color: c.color }}>{f1(c.growth)}</div>
                  <div style={{ font: '400 10px var(--font-sans)', color: '#B4AB98' }}>성장점수</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 노력 사분면 */}
        <SectionLabel>노력 사분면 · 시간 × 저항</SectionLabel>
        <Card>
          <div style={{ position: 'relative', width: '100%', height: 240, background: '#FAF6EC', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--line)' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--line)' }} />
            <Quad pos={{ top: 8, left: 10 }} color="#C3B9A4">시간 적고 저항 높음<br />· 미루는 영역</Quad>
            <Quad pos={{ top: 8, right: 10 }} color="var(--clay)" align="right">시간 많고 저항 높음<br />· 성장 영역</Quad>
            <Quad pos={{ bottom: 8, left: 10 }} color="#C3B9A4">시간 적고 저항 낮음<br />· 가볍게 하는 일</Quad>
            <Quad pos={{ bottom: 8, right: 10 }} color="var(--olive)" align="right">시간 많고 저항 낮음<br />· 잘 맞는 루틴</Quad>
            {cats.map((c) => {
              const left = 8 + (c.hours / maxH) * 80;
              const bottom = 8 + (c.avgRes / 5) * 80;
              const size = Math.round(18 + (c.effort / maxEff) * 26);
              const isSel = sel.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelId(c.id)}
                  style={{ position: 'absolute', left: `${left.toFixed(1)}%`, bottom: `${bottom.toFixed(1)}%`, transform: 'translate(-50%,50%)', width: size, height: size, borderRadius: '50%', background: c.color, border: isSel ? '3px solid var(--ink)' : '2px solid var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 9px var(--font-sans)', color: 'var(--card)', padding: 0 }}>
                  {c.name.slice(0, 1)}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 14, background: 'var(--card-2)', borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ font: '500 13px var(--font-sans)', color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: sel.color }} />{sel.name}
            </div>
            <div style={{ font: '400 12px/1.5 var(--font-sans)', color: '#8B6F4E' }}>{selInsight}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Quad({ children, pos, color, align }: { children: React.ReactNode; pos: React.CSSProperties; color: string; align?: 'right' }) {
  return (
    <div style={{ position: 'absolute', ...pos, font: '400 9.5px var(--font-sans)', color, textAlign: align === 'right' ? 'right' : 'left' }}>{children}</div>
  );
}
