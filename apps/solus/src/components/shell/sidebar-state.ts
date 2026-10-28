'use client';

import { useSyncExternalStore } from 'react';
import { SIDEBAR_KEY } from './sidebar-boot';

/**
 * Collapsed/expanded choice for the desktop sidebar. It is written to
 * <html data-sidebar> (read by the `expanded:` CSS variant) and remembered
 * per browser. Below 1280px the sidebar is always compact.
 */
const EVENT = 'solus-sidebar-change';

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

const isCollapsed = () => document.documentElement.dataset.sidebar === 'collapsed';

export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, () => false);
  const toggle = () => {
    const next = !isCollapsed();
    if (next) document.documentElement.dataset.sidebar = 'collapsed';
    else delete document.documentElement.dataset.sidebar;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      // Private mode or blocked storage: the choice lasts for this page only.
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [collapsed, toggle];
}
