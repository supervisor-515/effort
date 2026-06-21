import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const toastBase: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  right: 16,
  bottom: 76,
  zIndex: 50,
  background: 'var(--ink)',
  color: 'var(--card)',
  borderRadius: "var(--r-card)",
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  boxShadow: 'var(--shadow-overlay)',
  animation: 'slideIn .3s ease',
  font: '400 13px var(--font-sans)',
};

export function PwaToasts() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(
    () => localStorage.getItem('effort.installDismissed') === '1',
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismissInstall = () => {
    setInstallEvt(null);
    setInstallDismissed(true);
    localStorage.setItem('effort.installDismissed', '1');
  };

  if (needRefresh) {
    return (
      <div style={toastBase} role="status">
        <span style={{ flex: 1 }}>새 버전이 준비됐어요.</span>
        <button
          onClick={() => updateServiceWorker(true)}
          style={btnStyle}
        >
          새로고침
        </button>
        <button onClick={() => setNeedRefresh(false)} style={ghostBtn} aria-label="닫기">
          ×
        </button>
      </div>
    );
  }

  if (installEvt && !installDismissed) {
    return (
      <div style={toastBase} role="status">
        <span style={{ flex: 1 }}>홈 화면에 추가하면 앱처럼 열려요.</span>
        <button
          onClick={async () => {
            await installEvt.prompt();
            await installEvt.userChoice;
            dismissInstall();
          }}
          style={btnStyle}
        >
          추가
        </button>
        <button onClick={dismissInstall} style={ghostBtn} aria-label="닫기">
          ×
        </button>
      </div>
    );
  }

  return null;
}

const btnStyle: React.CSSProperties = {
  border: 'none',
  background: 'var(--olive)',
  color: 'var(--card)',
  borderRadius: 9,
  padding: '7px 12px',
  font: '600 13px var(--font-sans)',
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--card)',
  fontSize: 18,
  cursor: 'pointer',
  lineHeight: 1,
};
