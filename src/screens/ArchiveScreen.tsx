import { useMemo } from 'react';
import { useStore } from '../store';
import { f1, fmtHM, parseISODate, shortDateLabel } from '../lib/format';
import { aggregateByDay } from '../lib/score';
import { categoryStats, daySeries, streaks } from '../lib/stats';
import { BackHeader, EmptyState } from '../components/ui';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

type ArchiveCard = { label: string; value: string; sub: string; color: string; iconBg: string };

export function ArchiveScreen() {
  const { entries, categories, settings } = useStore();
  const coef = settings.resistanceCoef;
  const today = startOfToday();

  const cards = useMemo<ArchiveCard[] | null>(() => {
    if (entries.length === 0) return null;
    const days = [...aggregateByDay(entries, coef).values()];
    const withEffort = days.filter((d) => d.total > 0);
    if (withEffort.length === 0) return null;

    const mostClay = withEffort.reduce((a, d) => (d.clay > a.clay ? d : a));
    const longest = withEffort.reduce((a, d) => (d.hours > a.hours ? d : a));
    const easiestPool = withEffort.filter((d) => d.total > 2);
    const easiest = (easiestPool.length ? easiestPool : withEffort).reduce((a, d) => (d.resAvg < a.resAvg ? d : a));
    const cats = categoryStats(entries, categories, coef).filter((c) => c.effort > 0);
    const topGrowth = [...cats].sort((a, b) => b.growth - a.growth)[0];
    const maxStreak = streaks(entries, today).max;

    // 가장 균형 좋았던 주 (최근 16주 중 joy:clay 가 50:50 에 가깝고 노력량이 충분한 주)
    const series = daySeries(entries, coef, today, 16 * 7);
    let bestWeek: { joyPct: number; clayPct: number; startDate: string } | null = null;
    let bestScore = Infinity;
    for (let w = 0; w < 16; w++) {
      const grp = series.slice(w * 7, w * 7 + 7);
      const total = grp.reduce((a, d) => a + d.total, 0);
      if (total < 3) continue;
      const clay = grp.reduce((a, d) => a + d.clay, 0);
      const clayPct = Math.round((clay / total) * 100);
      const score = Math.abs(50 - clayPct);
      if (score < bestScore) {
        bestScore = score;
        bestWeek = { joyPct: 100 - clayPct, clayPct, startDate: grp[0].date };
      }
    }

    const out: ArchiveCard[] = [
      { label: '가장 많이 버틴 날', value: `${f1(mostClay.clay)}점`, sub: `${shortDateLabel(parseISODate(mostClay.date))} · 저항 ${f1(mostClay.resAvg)}`, color: 'var(--clay)', iconBg: 'var(--clay-subtle)' },
      { label: '가장 오래 쌓은 날', value: fmtHM(longest.hours), sub: `${shortDateLabel(parseISODate(longest.date))} · ${f1(longest.total)}점`, color: '#5E7184', iconBg: '#E2E6EC' },
      { label: '가장 편하게 흘러간 날', value: `${f1(easiest.total)}점`, sub: `${shortDateLabel(parseISODate(easiest.date))} · 저항 ${f1(easiest.resAvg)}`, color: 'var(--olive-2)', iconBg: '#E9EDDD' },
      { label: '가장 높은 성장 점수', value: topGrowth?.name ?? '—', sub: `성장점수 ${f1(topGrowth?.growth ?? 0)}`, color: 'var(--olive)', iconBg: 'var(--olive-subtle)' },
      { label: '가장 꾸준했던 기간', value: `${maxStreak}일`, sub: '연속 기록 · 최장', color: 'var(--clay-accent)', iconBg: '#F4E7D7' },
      bestWeek
        ? { label: '가장 균형 좋았던 주', value: `${bestWeek.joyPct} : ${bestWeek.clayPct}`, sub: `${shortDateLabel(parseISODate(bestWeek.startDate))} 주 · 즐겁게:버텨냄`, color: '#9B6B8E', iconBg: '#EDE2EC' }
        : { label: '가장 균형 좋았던 주', value: '—', sub: '아직 기록이 적어요', color: '#9B6B8E', iconBg: '#EDE2EC' },
    ];
    return out;
  }, [entries, categories, coef, today]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BackHeader title="최고기록 아카이브" sub="내 노력의 하이라이트" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        {!cards ? (
          <EmptyState title="하이라이트는 아직이에요" body="기록이 쌓이면 가장 버틴 날, 가장 오래 쌓은 날 같은 순간들을 모아 보여드릴게요." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            {cards.map((a, i) => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: "var(--r-card)", padding: 16, boxShadow: 'var(--shadow-raised)', minHeight: 130, display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: a.color }} />
                </div>
                <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--ink-soft)', lineHeight: 1.4 }}>{a.label}</div>
                <div style={{ font: '500 22px var(--font-serif)', color: 'var(--ink)', margin: '6px 0 auto' }}>{a.value}</div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 8 }}>{a.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
