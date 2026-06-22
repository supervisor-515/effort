import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { f1, fmtHM, parseISODate, shortDateLabel } from '../lib/format';
import { aggregateByDay, isClay } from '../lib/score';
import { categoryStats, density, stabilityIndex } from '../lib/stats';
import { periodFilter } from '../lib/period';
import { useStatsView } from '../statsView';
import { BackHeader, EmptyState } from '../components/ui';

function classifyStyle(clayPct: number, dens: number, stability: number): { style: string; note: string } {
  if (clayPct >= 45) return { style: '고저항 돌파형', note: `버텨낸 비율이 ${clayPct}%로 높았어요. 저항이 큰 일을 여러 번 정면으로 넘긴 달이에요.` };
  if (stability >= 70) return { style: '꾸준한 축적형', note: `안정감 지수 ${stability}로, 큰 기복 없이 매일 비슷하게 쌓은 단단한 달이에요.` };
  if (dens >= 1.6) return { style: '짧고 굵은 집중형', note: `투입 시간당 ${f1(dens)}점으로 밀도가 높았어요. 짧아도 깊게 몰입한 달입니다.` };
  return { style: '편안한 흐름형', note: `버텨낸 비율 ${clayPct}%로, 즐겁게 한 노력이 중심이 된 무리 없는 달이에요.` };
}

export function ReportScreen() {
  const { entries, categories, settings } = useStore();
  const coef = settings.resistanceCoef;
  const { anchor: today } = useStatsView();
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const r = useMemo(() => {
    const inMonth = periodFilter('month', today);
    const me = entries.filter(inMonth);
    if (me.length === 0) return null;
    const map = aggregateByDay(me, coef);
    const days = [...map.values()];
    const total = days.reduce((a, d) => a + d.total, 0);
    const hours = days.reduce((a, d) => a + d.hours, 0);
    const clay = days.reduce((a, d) => a + d.clay, 0);
    const clayPct = total ? Math.round((clay / total) * 100) : 0;
    const avgRes = me.reduce((a, e) => a + e.resistance, 0) / me.length;
    const cats = categoryStats(me, categories, coef).filter((c) => c.effort > 0);
    const topCat = [...cats].sort((a, b) => b.effort - a.effort)[0];
    const topClay = [...cats].sort((a, b) => b.clay - a.clay)[0];
    const topJoy = [...cats].sort((a, b) => a.avgRes - b.avgRes)[0];
    const best = days.reduce((a, d) => (d.total > a.total ? d : a), days[0]);
    const stability = stabilityIndex(entries, coef, today, 30);
    const { style, note } = classifyStyle(clayPct, density(total, hours), stability);
    return { total, hours, clayPct, avgRes, topCat, topClay, topJoy, best, style, note, stability };
  }, [entries, categories, coef, today]);

  const monthLabel = `${today.getMonth() + 1}월`;

  if (!r) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <BackHeader title="월간 리포트" />
        <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
          <EmptyState title={`${monthLabel}은 아직 비어 있어요`} body="이번 달 기록이 쌓이면 영수증처럼 한 장으로 정리해 드릴게요." />
        </div>
      </div>
    );
  }

  const summaryText = [
    `${today.getFullYear()}년 ${monthLabel} 노력 리포트`,
    `총 노력량 ${f1(r.total)}점 · 총 시간 ${fmtHM(r.hours)}`,
    `평균 저항도 ${f1(r.avgRes)} · 버텨낸 비율 ${r.clayPct}%`,
    `가장 많이 쌓인 영역: ${r.topCat?.name ?? '—'}`,
    `노력 스타일: ${r.style}`,
  ].join('\n');

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '노력 리포트', text: summaryText });
        return;
      }
      await navigator.clipboard.writeText(summaryText);
      setShareMsg('요약을 클립보드에 복사했어요.');
    } catch {
      setShareMsg('공유를 취소했어요.');
    }
    setTimeout(() => setShareMsg(null), 2200);
  };

  const onSave = () => {
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `노력리포트-${today.getFullYear()}-${monthLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShareMsg('리포트를 저장했어요.');
    setTimeout(() => setShareMsg(null), 2200);
  };

  const bestDay = `${shortDateLabel(parseISODate(r.best.date))} · ${f1(r.best.total)}점`;
  const clayCount = entries.filter(periodFilter('month', today)).filter(isClay).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BackHeader title="월간 리포트" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: "var(--r-card)", padding: '24px 22px', boxShadow: 'var(--shadow-raised)', animation: 'fadeUp .5s ease' }}>
          <div style={{ textAlign: 'center', borderBottom: '1.5px dashed var(--border-bold)', paddingBottom: 18 }}>
            <div style={{ font: '700 13px var(--font-sans)', color: 'var(--clay-accent)' }}>{today.getFullYear()}년 월간 요약</div>
            <div style={{ font: '600 30px var(--font-serif)', color: 'var(--ink)', marginTop: 6 }}>{monthLabel}의 노력 리포트</div>
          </div>

          <div style={{ display: 'flex', margin: '20px 0' }}>
            <BigCell value={f1(r.total)} label="총 노력량" />
            <div style={{ width: 1, background: 'var(--line-2)' }} />
            <BigCell value={fmtHM(r.hours)} label="총 투입 시간" />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <MidCell value={f1(r.avgRes)} label="평균 저항도" />
            <MidCell value={`${r.clayPct}%`} label="버텨낸 비율" color="var(--clay)" />
            <MidCell value={String(r.stability)} label="안정감 지수" color="var(--olive)" />
          </div>

          <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Row label="가장 많이 쌓인 영역" value={r.topCat?.name ?? '—'} color="var(--olive)" />
            <Row label="가장 많이 버틴 영역" value={r.topClay?.name ?? '—'} color="var(--clay)" />
            <Row label="가장 편하게 이어간 영역" value={r.topJoy?.name ?? '—'} color="var(--olive-2)" />
            <Row label="가장 노력한 날" value={bestDay} color="var(--ink)" last />
          </div>

          <div style={{ background: 'var(--olive)', borderRadius: "var(--r-card)", padding: 18 }}>
            <div style={{ font: '700 12px var(--font-sans)', color: 'rgba(255,255,255,0.8)' }}>이번 달 노력 스타일</div>
            <div style={{ font: '500 24px var(--font-serif)', color: 'var(--card)', margin: '8px 0' }}>{r.style}</div>
            <div style={{ font: '400 13px/1.6 var(--font-sans)', color: 'rgba(255,255,255,0.85)' }}>{r.note}</div>
          </div>

          <div style={{ marginTop: 16, background: 'var(--card-2)', borderRadius: "var(--r-card)", padding: 16 }}>
            <div style={{ font: '600 11px var(--font-sans)', letterSpacing: '.06em', color: 'var(--clay-accent)', marginBottom: 7 }}>다음 달을 위한 한 줄</div>
            <div style={{ font: '400 14px/1.6 var(--font-sans)', color: 'var(--ink-soft)' }}>
              {r.clayPct >= 45
                ? `이번 달은 ${clayCount}번의 버텨낸 순간이 있었어요. 다음 달엔 가볍게 쌓는 날도 의식적으로 넣어보세요.`
                : '다음 달엔 작은 기록을 자주 쌓아보세요. 하루 한 줄이면 충분합니다.'}
            </div>
          </div>

          <div style={{ textAlign: 'center', borderTop: '1.5px dashed var(--border-bold)', marginTop: 20, paddingTop: 16 }}>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)' }}>묵묵히 쌓은 {monthLabel}의 기록</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={onSave} style={{ flex: 1, height: 48, borderRadius: "var(--r-card)", border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)', font: '600 14px var(--font-sans)', cursor: 'pointer' }}>저장하기</button>
          <button onClick={onShare} style={{ flex: 1, height: 48, borderRadius: "var(--r-card)", border: 'none', background: 'var(--olive)', color: 'var(--card)', font: '600 14px var(--font-sans)', cursor: 'pointer' }}>공유하기</button>
        </div>
        {shareMsg && <div style={{ textAlign: 'center', font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 12 }}>{shareMsg}</div>}
      </div>
    </div>
  );
}

function BigCell({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ font: '500 34px var(--font-serif)', color: 'var(--ink)' }}>{value}</div>
      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 3 }}>{label}</div>
    </div>
  );
}
function MidCell({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--card-2)', borderRadius: "var(--r-card-sm)", padding: 13, textAlign: 'center' }}>
      <div style={{ font: '500 22px var(--font-serif)', color: color ?? 'var(--ink)' }}>{value}</div>
      <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Row({ label, value, color, last }: { label: string; value: string; color: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 13px var(--font-sans)', color: 'var(--ink-soft)', borderBottom: last ? 'none' : '1px solid var(--line-2)', paddingBottom: last ? 0 : 10 }}>
      <span>{label}</span>
      <b style={{ fontWeight: 600, color }}>{value}</b>
    </div>
  );
}
