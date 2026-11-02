import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { EngineConfig, MessagesClient } from './engine';
import { createFallbackClient, type ProviderSlot } from './fallback-client';
import { createOpenAICompatClient } from './openai-client';

/**
 * AI settings, read on the server only (no NEXT_PUBLIC_ variable).
 *
 *   SOLUS_AI_PROVIDER     anthropic | openai. Empty: anthropic when
 *                         ANTHROPIC_API_KEY is set, otherwise openai when a
 *                         provider below is set; with neither, the analyst is off
 *
 * Claude (provider anthropic):
 *   ANTHROPIC_API_KEY     key of the Claude API
 *   SOLUS_AI_MODEL        default claude-opus-5-5
 *   SOLUS_AI_EFFORT       low | medium | high, default medium
 *
 * OpenAI-compatible APIs (provider openai: Groq, OpenRouter, Gemini, DeepSeek…),
 * in order of preference. When one hits its limit, the next one answers:
 *   SOLUS_AI_1_API_KEY / _BASE_URL / _MODEL / _MAX_TOKENS / _NAME
 *   SOLUS_AI_2_…  up to  SOLUS_AI_9_…
 * Slot 1 also reads the unnumbered SOLUS_AI_API_KEY, SOLUS_AI_BASE_URL
 * (default https://api.deepseek.com) and SOLUS_AI_MODEL (default deepseek-chat).
 * From slot 2 on, the model is required; a slot without key or base URL uses
 * the previous slot's (the same provider with another model, which on most
 * free plans has its own limit).
 *   SOLUS_AI_MAX_TOKENS   output limit per call, default 8000
 *   SOLUS_AI_STRICT_TOOLS "on" sends strict function schemas (only if every provider supports it)
 *
 * Demo:
 *   SOLUS_DEMO_AI         "on" lets the analyst answer in /demo (fictitious data)
 *   SOLUS_DEMO_AI_CODE    access code required in /demo (8+ characters);
 *                         without it the demo analyst stays off
 *
 * Keys are read here and passed to the clients; they never reach a browser
 * bundle (`server-only`) nor the logs.
 */

export type AiProvider = 'anthropic' | 'openai';

const EFFORTS = new Set(['low', 'medium', 'high']);
const CLAUDE_MODEL_ID = /^[a-z0-9][a-z0-9.-]{2,63}$/;
// OpenRouter usa ids como "deepseek/deepseek-chat:free".
const OPENAI_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$/;
const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_OPENAI_MODEL = 'deepseek-chat';
const MAX_SLOTS = 9;

const env = (name: string) => process.env[name]?.trim() || undefined;

/** Base URL, only http(s); https outside localhost. */
function validBaseUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function tokens(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 256 && parsed <= 64_000 ? parsed : null;
}

export interface SlotConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number | null;
}

/** The OpenAI-compatible providers, in order. Invalid slots are skipped. */
export function getProviderSlots(): SlotConfig[] {
  const slots: SlotConfig[] = [];
  let previous: { apiKey?: string; baseUrl?: string } = {};
  for (let n = 1; n <= MAX_SLOTS; n++) {
    const read = (field: string) => env(`SOLUS_AI_${n}_${field}`) ?? (n === 1 ? env(`SOLUS_AI_${field}`) : undefined);
    const apiKey = read('API_KEY') ?? previous.apiKey;
    const rawBase = read('BASE_URL') ?? (n === 1 ? DEFAULT_BASE_URL : previous.baseUrl);
    const rawModel = read('MODEL') ?? (n === 1 ? DEFAULT_OPENAI_MODEL : undefined);
    const declared = n === 1 || env(`SOLUS_AI_${n}_MODEL`) || env(`SOLUS_AI_${n}_API_KEY`) || env(`SOLUS_AI_${n}_BASE_URL`);
    if (!declared) continue;

    const baseUrl = rawBase ? validBaseUrl(rawBase) : null;
    const model = rawModel && OPENAI_MODEL_ID.test(rawModel) ? rawModel : null;
    if (!apiKey || !baseUrl || !model) continue;
    previous = { apiKey, baseUrl };
    const label = read('NAME')?.slice(0, 40) ?? `${new URL(baseUrl).hostname.replace(/^api\./, '')}/${model}`;
    slots.push({ name: label, apiKey, baseUrl, model, maxTokens: tokens(read('MAX_TOKENS')) });
  }
  return slots;
}

export function getAiProvider(): AiProvider | null {
  const chosen = env('SOLUS_AI_PROVIDER')?.toLowerCase();
  if (chosen === 'anthropic') return env('ANTHROPIC_API_KEY') ? 'anthropic' : null;
  if (chosen === 'openai') return getProviderSlots().length > 0 ? 'openai' : null;
  if (chosen) return null;
  if (env('ANTHROPIC_API_KEY')) return 'anthropic';
  if (getProviderSlots().length > 0) return 'openai';
  return null;
}

export function getAiConfig(): EngineConfig | null {
  const provider = getAiProvider();
  if (!provider) return null;
  const base = { maxSteps: 6, softDeadlineMs: 40_000 };

  if (provider === 'openai') {
    return {
      ...base,
      model: getProviderSlots()[0]!.model,
      effort: 'medium', // não há equivalente na API de Chat Completions
      maxTokens: tokens(env('SOLUS_AI_MAX_TOKENS')) ?? 8_000,
    };
  }
  const model = env('SOLUS_AI_MODEL');
  const effort = env('SOLUS_AI_EFFORT');
  return {
    ...base,
    model: model && CLAUDE_MODEL_ID.test(model) ? model : 'claude-opus-5-5',
    effort: effort && EFFORTS.has(effort) ? (effort as EngineConfig['effort']) : 'medium',
    maxTokens: 16_000,
  };
}

function buildOpenAIClient(slots: SlotConfig[]): MessagesClient {
  const single = slots.length === 1;
  const strictTools = env('SOLUS_AI_STRICT_TOOLS') === 'on';
  const providers: ProviderSlot[] = slots.map((slot) => ({
    name: slot.name,
    model: slot.model,
    maxTokens: slot.maxTokens,
    client: createOpenAICompatClient({
      apiKey: slot.apiKey,
      baseUrl: slot.baseUrl,
      strictTools,
      headers: { 'X-Title': 'SOLUS' },
      // Com um só provedor, insiste nele; com vários, passa logo para o próximo.
      maxRetries: single ? 2 : 0,
      timeoutMs: single ? 45_000 : 25_000,
    }),
  }));
  return createFallbackClient(providers, {
    onFailure: ({ provider, status, reason, restMs, next }) => {
      console.warn('[solus] ia: provedor falhou', { provider, status, reason, restSeconds: Math.round(restMs / 1000), next });
    },
  });
}

let client: { key: string; instance: MessagesClient } | null = null;

export function getAiClient(): MessagesClient {
  const provider = getAiProvider() ?? 'anthropic';
  const slots = provider === 'openai' ? getProviderSlots() : [];
  // A instância guarda o descanso de cada provedor; só é recriada se a configuração mudar.
  const key = JSON.stringify([provider, slots, env('SOLUS_AI_STRICT_TOOLS')]);
  if (client?.key === key) return client.instance;
  // 2 tentativas automáticas em 429/5xx; o tempo total de cada chamada fica abaixo do limite da rota.
  const instance: MessagesClient =
    provider === 'openai' ? buildOpenAIClient(slots) : new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), maxRetries: 2, timeout: 45_000 });
  client = { key, instance };
  return instance;
}

/** The demo analyst's access code, or null when the demo analyst is off. */
export function getDemoAiCode(): string | null {
  if (process.env.SOLUS_DEMO_AI?.trim() !== 'on' || !getAiConfig()) return null;
  const code = process.env.SOLUS_DEMO_AI_CODE?.trim();
  return code && code.length >= 8 ? code : null;
}
