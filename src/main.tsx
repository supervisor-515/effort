import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { StoreProvider } from './store';
import { StatsViewProvider } from './statsView';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <StatsViewProvider>
        <App />
      </StatsViewProvider>
    </StoreProvider>
  </StrictMode>,
);
