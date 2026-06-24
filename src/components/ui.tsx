import type { CSSProperties, ReactNode } from 'react';
import { navigate } from '../router';

/** 기본 카드: 흰 표면 + 1px 보더 + 아주 옅은 그림자(Atlassian raised) */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-card)',
        padding: 16,
        boxShadow: 'var(--shadow-raised)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 섹션 제목 — 대문자/레터스페이싱 eyebrow 대신 문장형 소제목 */
export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        font: '700 14px var(--font-sans)',
        color: 'var(--ink)',
        margin: '24px 4px 10px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ScreenHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ padding: '18px 20px 12px', flex: 'none' }}>
      <div style={{ font: '700 22px var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</div>
      {sub && <div style={{ font: '400 13px var(--font-sans)', color: 'var(--ink-soft)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function BackHeader({ title, sub, to = '#/stats' }: { title: string; sub?: string; to?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px', flex: 'none' }}>
      <button onClick={() => navigate(to)} aria-label="뒤로" style={iconButton}>‹</button>
      <div>
        <div style={{ font: '700 18px var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</div>
        {sub && <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-soft)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card style={{ textAlign: 'center', padding: '28px 20px' }}>
      <div style={{ font: '700 16px var(--font-sans)', color: 'var(--ink)', marginBottom: 6 }}>{title}</div>
      <div style={{ font: '400 13px/1.6 var(--font-sans)', color: 'var(--ink-soft)' }}>{body}</div>
    </Card>
  );
}

/** 옅은 배경 위 회고/해설 한 줄(앱 곳곳의 tinted note 박스 공통화) */
export function SoftNote({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--clay-accent)', background: 'var(--card-2)', borderRadius: 10, padding: '10px 12px', ...style }}>
      {children}
    </div>
  );
}

export function StatTriple({ items }: { items: { value: ReactNode; label: string; color?: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ flex: 1, background: 'var(--card-2)', borderRadius: 'var(--r-card-sm)', padding: 12 }}>
          <div style={{ font: '600 18px var(--font-serif)', color: it.color ?? 'var(--ink)' }}>{it.value}</div>
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 3 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Atlassian 로젠지: 옅은 톤 배경 + 진한 텍스트, 라운드 4px, 문장형(대문자 금지) */
export type Tone = 'olive' | 'clay' | 'neutral';
const TONE: Record<Tone, { bg: string; fg: string }> = {
  olive: { bg: 'var(--olive-subtle)', fg: 'var(--olive-text)' },
  clay: { bg: 'var(--clay-subtle)', fg: 'var(--clay-accent)' },
  neutral: { bg: 'var(--neutral-subtle)', fg: 'var(--ink-soft)' },
};

export function Lozenge({ tone = 'neutral', children, dot, style }: { tone?: Tone; children: ReactNode; dot?: boolean; style?: CSSProperties }) {
  const t = TONE[tone];
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: t.bg, color: t.fg,
        borderRadius: 'var(--r-tag)', padding: '3px 7px',
        font: '700 11px var(--font-sans)', lineHeight: 1.3, whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}

/* ── 공유 버튼/컨트롤 스타일 (Atlassian 위계) ── */
export const iconButton: CSSProperties = {
  width: 32, height: 32, flex: 'none', borderRadius: 'var(--r-ctl)',
  border: '1px solid var(--line)', background: 'var(--card)',
  color: 'var(--ink-soft)', fontSize: 17, lineHeight: 1, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

/** primary(brand bold) 버튼 */
export const btnPrimary: CSSProperties = {
  border: 'none', background: 'var(--olive)', color: '#fff',
  borderRadius: 'var(--r-ctl)', font: '600 14px var(--font-sans)', cursor: 'pointer',
};

/** default(neutral subtle) 버튼 */
export const btnDefault: CSSProperties = {
  border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)',
  borderRadius: 'var(--r-ctl)', font: '500 14px var(--font-sans)', cursor: 'pointer',
};
