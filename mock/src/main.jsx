import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PlannerMock from './PlannerMock.jsx';

const WikiMock = lazy(() => import('./WikiMock.jsx'));
function MockApp() {
  const [route, setRoute] = useState(() =>
    Object.fromEntries(new URLSearchParams(location.search)),
  );
  const plannerUrl = useRef('?view=today');
  useEffect(() => {
    document.title =
      route.view === 'wiki' ? 'Worklane · 위키' : 'Worklane · 업무 플래너';
  }, [route.view]);
  useEffect(() => {
    const pop = () =>
      setRoute(Object.fromEntries(new URLSearchParams(location.search)));
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  function navigate(params) {
    const search = '?' + new URLSearchParams(params);
    history.pushState(null, '', search);
    setRoute(params);
  }
  function openWiki(page) {
    plannerUrl.current = location.search;
    navigate({ view: 'wiki', ...(page ? { page } : { tab: 'home' }) });
  }
  function planner(view, extras = {}) {
    navigate(
      view
        ? { view, ...extras }
        : Object.fromEntries(new URLSearchParams(plannerUrl.current)),
    );
  }
  return route.view === 'wiki' ? (
    <Suspense
      fallback={<div className="wiki-loading">위키를 열고 있어요…</div>}
    >
      <WikiMock route={route} navigate={navigate} onPlanner={planner} />
    </Suspense>
  ) : (
    <PlannerMock
      onOpenWiki={openWiki}
      initialFilter={route.filter}
      initialBacklog={route.backlog === '1'}
    />
  );
}
createRoot(document.getElementById('root')).render(<MockApp />);
