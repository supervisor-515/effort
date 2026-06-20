import { BottomTabs } from './components/BottomTabs';
import { PwaToasts } from './components/PwaToasts';
import { useRoute } from './router';
import { InputScreen } from './screens/InputScreen';
import { StatsMainScreen } from './screens/StatsMainScreen';
import { ResistanceScreen } from './screens/ResistanceScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { ReportScreen } from './screens/ReportScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  const route = useRoute();

  let screen;
  if (route.tab === 'input') screen = <InputScreen />;
  else if (route.tab === 'settings') screen = <SettingsScreen />;
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
    </>
  );
}
