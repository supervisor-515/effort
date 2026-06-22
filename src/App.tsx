import { useEffect, useState } from 'react';
import { BottomTabs } from './components/BottomTabs';
import { PwaToasts } from './components/PwaToasts';
import { GuideModal } from './components/GuideModal';
import { useRoute } from './router';
import { useStore } from './store';
import { InputScreen } from './screens/InputScreen';
import { StatsMainScreen } from './screens/StatsMainScreen';
import { ResistanceScreen } from './screens/ResistanceScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { ReportScreen } from './screens/ReportScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const GUIDE_SEEN_KEY = 'effort.guideSeen';

export function App() {
  const route = useRoute();
  const { settings } = useStore();
  const [guideOpen, setGuideOpen] = useState(false);

  // 첫 실행 시 사용 안내 자동 표시
  useEffect(() => {
    if (localStorage.getItem(GUIDE_SEEN_KEY) !== '1') setGuideOpen(true);
  }, []);

  // 테마 적용 (auto = 시스템 설정 따름)
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = settings.theme === 'dark'
        || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    if (settings.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [settings.theme]);

  const closeGuide = () => {
    setGuideOpen(false);
    try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch { /* 무시 */ }
  };

  let screen;
  if (route.tab === 'input') screen = <InputScreen />;
  else if (route.tab === 'settings') screen = <SettingsScreen onOpenGuide={() => setGuideOpen(true)} />;
  else {
    switch (route.sub) {
      case 'resistance': screen = <ResistanceScreen />; break;
      case 'category': screen = <CategoryScreen />; break;
      case 'report': screen = <ReportScreen />; break;
      case 'archive': screen = <ArchiveScreen />; break;
      default: screen = <StatsMainScreen />; break;
    }
  }

  return (
    <>
      {screen}
      <PwaToasts />
      <BottomTabs active={route.tab} />
      <GuideModal open={guideOpen} onClose={closeGuide} />
    </>
  );
}
