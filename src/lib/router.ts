import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'tournament'; id: string };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'novo') return { name: 'create' };
  if (parts[0] === 'c' && parts[1]) return { name: 'tournament', id: decodeURIComponent(parts[1]) };
  return { name: 'home' };
}

export function navigate(path: string) {
  const target = `#${path}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
