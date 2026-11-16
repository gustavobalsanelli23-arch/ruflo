'use client';

import { useSyncExternalStore } from 'react';

/**
 * The visitor's choice about optional (analytics) storage, kept in
 * localStorage. Essential cookies never depend on it; product analytics
 * (PostHog) loads only after "Aceitar". The version lets a material change in
 * what is collected ask again.
 */
export const CONSENT_KEY = 'solus-consentimento';
export const CONSENT_VERSION = '2026-11-16';

export type ConsentChoice = 'granted' | 'denied' | null;

const listeners = new Set<() => void>();

export function readConsent(): ConsentChoice {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: string; analytics?: boolean };
    if (parsed.version !== CONSENT_VERSION || typeof parsed.analytics !== 'boolean') return null;
    return parsed.analytics ? 'granted' : 'denied';
  } catch {
    return null;
  }
}

export function setConsent(analytics: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION, analytics, at: new Date().toISOString() }));
  } catch {
    // Private mode without storage: the choice lasts only for this page.
    memory = analytics ? 'granted' : 'denied';
  }
  listeners.forEach((listener) => listener());
}

/** Clears the choice so the banner asks again (the "change my choice" link). */
export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // nothing stored
  }
  memory = null;
  listeners.forEach((listener) => listener());
}

let memory: ConsentChoice = null;

function snapshot(): ConsentChoice {
  return readConsent() ?? memory;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * `undefined` on the server and on the first client render, so nothing flashes
 * or mismatches during hydration; then the stored choice (null = not asked yet).
 */
export function useConsent(): ConsentChoice | undefined {
  return useSyncExternalStore<ConsentChoice | undefined>(subscribe, snapshot, () => undefined);
}
