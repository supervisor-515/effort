import { navigate, type Route } from '../router';

const TABS: { key: Route['tab']; icon: string; label: string; path: string }[] = [
  { key: 'input', icon: '①', label: '입력', path: '#/input' },
  { key: 'stats', icon: '②', label: '통계', path: '#/stats' },
  { key: 'settings', icon: '③', label: '설정', path: '#/settings' },
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
            style={{
              border: 'none', background: 'transparent', textAlign: 'center',
              color: on ? 'var(--olive)' : 'var(--ink-mute)', cursor: 'pointer',
            }}
          >
            <div style={{ font: '600 13px var(--font-serif)' }}>{t.icon}</div>
            <div style={{ font: `${on ? 600 : 400} 10px var(--font-sans)`, marginTop: 2 }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}
