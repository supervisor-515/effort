import { navigate, type Route } from '../router';

type TabDef = { key: Route['tab']; label: string; path: string; icon: (active: boolean) => JSX.Element };

const svg = (children: JSX.Element) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const TABS: TabDef[] = [
  {
    key: 'input', label: '입력', path: '#/input',
    // 연필 — 기록하기
    icon: () => svg(<><path d="M15.5 4.5l4 4" /><path d="M16.5 3.5l4 4L9 19l-5 1 1-5L16.5 3.5z" /></>),
  },
  {
    key: 'stats', label: '통계', path: '#/stats',
    // 차오르는 막대 — 누적/적립
    icon: () => svg(<><path d="M4 20h16" /><path d="M7.5 20v-4.5" /><path d="M12 20v-9" /><path d="M16.5 20v-6.5" /></>),
  },
  {
    key: 'settings', label: '설정', path: '#/settings',
    // 슬라이더 — 규칙 조절
    icon: (active) => svg(
      <>
        <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" />
        <circle cx={9} cy={7} r={2.2} fill={active ? 'var(--olive-subtle)' : 'var(--card)'} />
        <circle cx={15} cy={12} r={2.2} fill={active ? 'var(--olive-subtle)' : 'var(--card)'} />
        <circle cx={8} cy={17} r={2.2} fill={active ? 'var(--olive-subtle)' : 'var(--card)'} />
      </>,
    ),
  },
];

export function BottomTabs({ active }: { active: Route['tab'] }) {
  return (
    <div
      style={{
        height: 64,
        flex: 'none',
        background: 'var(--card)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 6,
        zIndex: 4,
      }}
    >
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => navigate(t.path)}
            aria-label={t.label}
            aria-current={on ? 'page' : undefined}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: 1, height: '100%', padding: 0,
            }}
          >
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 34, borderRadius: 'var(--r-pill)',
                background: on ? 'var(--olive-subtle)' : 'transparent',
                color: on ? 'var(--olive-text)' : 'var(--ink-mute)',
                transition: 'background .2s, color .2s',
              }}
            >
              {t.icon(on)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
