'use client';

import { useCallback, useRef } from 'react';

/**
 * Dialogs and sheets opened from state (no Radix trigger) would drop focus on
 * <body> when they close. Remember what opened them and return focus there.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  const capture = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
  }, []);
  const onCloseAutoFocus = useCallback((event: Event) => {
    if (opener.current?.isConnected) {
      event.preventDefault();
      opener.current.focus();
    }
    opener.current = null;
  }, []);
  return { capture, onCloseAutoFocus };
}
