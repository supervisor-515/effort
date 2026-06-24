import { useEffect, useState } from 'react';

export type Route =
  | { tab: 'input'; date?: string }
  | { tab: 'stats'; sub: 'main' | 'resistance' | 'category' | 'report' | 'archive' | 'calendar' }
  | { tab: 'settings' };

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'settings') return { tab: 'settings' };
  if (parts[0] === 'input') {
    return ISO_RE.test(parts[1] ?? '') ? { tab: 'input', date: parts[1] } : { tab: 'input' };
  }
  if (parts[0] === 'stats') {
    const sub = parts[1] as 'resistance' | 'category' | 'report' | 'archive' | 'calendar' | undefined;
    if (sub === 'resistance' || sub === 'category' || sub === 'report' || sub === 'archive' || sub === 'calendar') {
      return { tab: 'stats', sub };
    }
    return { tab: 'stats', sub: 'main' };
  }
  return { tab: 'input' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.hash = '#/input';
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
