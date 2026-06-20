import type { CSSProperties, ReactNode } from 'react';
import { navigate } from '../router';

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: 18,
        boxShadow: '0 4px 16px rgba(90,70,35,.05)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        font: '600 12px var(--font-sans)',
        letterSpacing: '.04em',
        color: 'var(--ink-mute)',
        margin: '24px 6px 12px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ScreenHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ padding: '2px 22px 12px', flex: 'none' }}>
      <div style={{ font: '600 24px var(--font-serif)', color: 'var(--ink)' }}>{title}</div>
      {sub && <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export function BackHeader({ title, sub, to = '#/stats' }: { title: string; sub?: string; to?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 18px 12px', flex: 'none' }}>
      <button
        onClick={() => navigate(to)}
        aria-label="뒤로"
        style={{
          width: 34, height: 34, borderRadius: '50%', border: '1px solid #E4DCCB',
          background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 16, cursor: 'pointer',
        }}
      >
        ‹
      </button>
      <div>
        <div style={{ font: '600 19px var(--font-serif)', color: 'var(--ink)' }}>{title}</div>
        {sub && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card style={{ textAlign: 'center', padding: '32px 22px' }}>
      <div style={{ font: '500 16px var(--font-sans)', color: 'var(--ink)', marginBottom: 8 }}>{title}</div>
      <div style={{ font: '400 13px/1.7 var(--font-sans)', color: 'var(--ink-mute)' }}>{body}</div>
    </Card>
  );
}

export function StatTriple({ items }: { items: { value: ReactNode; label: string; color?: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ flex: 1, background: 'var(--card-2)', borderRadius: 13, padding: 12 }}>
          <div style={{ font: '500 18px var(--font-serif)', color: it.color ?? 'var(--ink)' }}>{it.value}</div>
          <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}
