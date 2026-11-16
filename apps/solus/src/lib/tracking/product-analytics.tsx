'use client';

import { useEffect } from 'react';
import type { PostHog } from 'posthog-js';
import { useConsent } from './consent';

/**
 * Product analytics (PostHog, EU region), loaded only after the visitor
 * accepts it in the consent banner. The browser sends events straight to
 * PostHog's EU host, allowed in the CSP only when a key is set (headers.ts).
 *
 * Business data never leaves through here: every text and attribute is
 * masked in autocapture and in session replay, inputs are masked, and events
 * carry only names, counts and ids, never figures, products or e-mails.
 */

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
let pendingIdentity: Identity | null = null;

interface Identity {
  userId: string;
  organizationId?: string;
  plan?: string;
}

function load(apiKey: string) {
  loading ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(apiKey, {
      api_host: 'https://eu.i.posthog.com',
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-08-30',
      person_profiles: 'identified_only',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: { maskAllInputs: true, maskTextSelector: '*' },
      disable_surveys: true,
      persistence: 'localStorage+cookie',
    });
    client = posthog;
    if (pendingIdentity) applyIdentity(pendingIdentity);
    return posthog;
  }).catch(() => null);
  return loading;
}

function applyIdentity({ userId, organizationId, plan }: Identity) {
  client?.identify(userId, { organization_id: organizationId, plan });
}

/** Sends a named funnel event; a no-op until consent and the key exist. */
export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean | null>) {
  client?.capture(event, properties);
}

export type AnalyticsEvent =
  | 'cadastro_enviado'
  | 'importacao_concluida'
  | 'analise_executada'
  | 'pergunta_ia'
  | 'plano_escolhido';

export function ProductAnalytics({ apiKey }: { apiKey: string | null }) {
  const consent = useConsent();
  useEffect(() => {
    if (!apiKey || consent === undefined) return;
    if (consent === 'granted') {
      void load(apiKey).then((posthog) => {
        posthog?.set_config({ disable_persistence: false });
        posthog?.opt_in_capturing();
      });
    } else if (client) {
      // Consent withdrawn: stop capturing, stop writing, and erase what it kept.
      // (reset() would mint a new anonymous id and call PostHog again.)
      client.opt_out_capturing();
      client.set_config({ disable_persistence: true });
      forgetDevice();
    }
  }, [apiKey, consent]);
  return null;
}

/** Removes PostHog's cookies and localStorage entries (all named ph_…). */
function forgetDevice() {
  for (const name of document.cookie.split(';').map((part) => part.split('=')[0]!.trim())) {
    if (!name.startsWith('ph_') && !name.startsWith('__ph_')) continue;
    // PostHog may set it on the parent domain (cross-subdomain): clear every level.
    const parts = location.hostname.split('.');
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (let i = 0; i < parts.length - 1; i++) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${parts.slice(i).join('.')}`;
    }
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('ph_') || key.startsWith('__ph_')) localStorage.removeItem(key);
    }
  } catch {
    // no storage
  }
}

/** Links events to the signed-in person (by id only) once analytics runs. */
export function AnalyticsIdentity(identity: Identity) {
  const { userId, organizationId, plan } = identity;
  useEffect(() => {
    pendingIdentity = { userId, organizationId, plan };
    applyIdentity(pendingIdentity);
  }, [userId, organizationId, plan]);
  return null;
}
