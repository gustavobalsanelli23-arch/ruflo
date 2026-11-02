import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { EngineConfig, MessagesClient } from './engine';
import { createOpenAICompatClient } from './openai-client';

/**
 * AI settings, read on the server only (no NEXT_PUBLIC_ variable).
 *
 *   SOLUS_AI_PROVIDER     anthropic | openai. Empty: anthropic when
 *                         ANTHROPIC_API_KEY is set, otherwise openai when
 *                         SOLUS_AI_API_KEY is set; with neither, the analyst is off
 *   SOLUS_AI_MODEL        model id (anthropic: default claude-opus-5-5;
 *                         openai: default deepseek-chat)
 *
 * Claude (provider anthropic):
 *   ANTHROPIC_API_KEY     key of the Claude API
 *   SOLUS_AI_EFFORT       low | medium | high, default medium
 *
 * Any OpenAI-compatible API (provider openai: DeepSeek, OpenRouter, Groq…):
 *   SOLUS_AI_API_KEY      key of the provider
 *   SOLUS_AI_BASE_URL     default https://api.deepseek.com
 *   SOLUS_AI_MAX_TOKENS   output limit per call, default 8000
 *   SOLUS_AI_STRICT_TOOLS "on" sends strict function schemas (only if the provider supports it)
 *
 * Demo:
 *   SOLUS_DEMO_AI         "on" lets the analyst answer in /demo (fictitious data)
 *   SOLUS_DEMO_AI_CODE    access code required in /demo (8+ characters);
 *                         without it the demo analyst stays off
 *
 * Keys are read here and passed to the client; they never reach a browser
 * bundle (`server-only`).
 */

export type AiProvider = 'anthropic' | 'openai';

const EFFORTS = new Set(['low', 'medium', 'high']);
const CLAUDE_MODEL_ID = /^[a-z0-9][a-z0-9.-]{2,63}$/;
// OpenRouter usa ids como "deepseek/deepseek-chat:free".
const OPENAI_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$/;
const DEFAULT_BASE_URL = 'https://api.deepseek.com';

const env = (name: string) => process.env[name]?.trim() || undefined;

export function getAiProvider(): AiProvider | null {
  const chosen = env('SOLUS_AI_PROVIDER')?.toLowerCase();
  if (chosen === 'anthropic') return env('ANTHROPIC_API_KEY') ? 'anthropic' : null;
  if (chosen === 'openai') return env('SOLUS_AI_API_KEY') && baseUrl() ? 'openai' : null;
  if (chosen) return null;
  if (env('ANTHROPIC_API_KEY')) return 'anthropic';
  if (env('SOLUS_AI_API_KEY') && baseUrl()) return 'openai';
  return null;
}

/** The provider's base URL, only http(s); https outside localhost. */
function baseUrl(): string | null {
  const raw = env('SOLUS_AI_BASE_URL') ?? DEFAULT_BASE_URL;
  try {
    const url = new URL(raw);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function positiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 256 && parsed <= max ? parsed : fallback;
}

export function getAiConfig(): EngineConfig | null {
  const provider = getAiProvider();
  if (!provider) return null;
  const model = env('SOLUS_AI_MODEL');
  const effort = env('SOLUS_AI_EFFORT');
  const base = { maxSteps: 6, softDeadlineMs: 40_000 };

  if (provider === 'openai') {
    return {
      ...base,
      model: model && OPENAI_MODEL_ID.test(model) ? model : 'deepseek-chat',
      effort: 'medium', // não há equivalente na API de Chat Completions
      maxTokens: positiveInt(env('SOLUS_AI_MAX_TOKENS'), 8_000, 64_000),
    };
  }
  return {
    ...base,
    model: model && CLAUDE_MODEL_ID.test(model) ? model : 'claude-opus-5-5',
    effort: effort && EFFORTS.has(effort) ? (effort as EngineConfig['effort']) : 'medium',
    maxTokens: 16_000,
  };
}

let client: { provider: AiProvider; instance: MessagesClient } | null = null;

export function getAiClient(): MessagesClient {
  const provider = getAiProvider() ?? 'anthropic';
  if (client?.provider === provider) return client.instance;
  // 2 tentativas automáticas em 429/5xx; o tempo total de cada chamada fica abaixo do limite da rota.
  const instance: MessagesClient =
    provider === 'openai'
      ? createOpenAICompatClient({
          apiKey: env('SOLUS_AI_API_KEY') ?? '',
          baseUrl: baseUrl() ?? DEFAULT_BASE_URL,
          strictTools: env('SOLUS_AI_STRICT_TOOLS') === 'on',
          headers: { 'X-Title': 'SOLUS' },
          maxRetries: 2,
          timeoutMs: 45_000,
        })
      : new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), maxRetries: 2, timeout: 45_000 });
  client = { provider, instance };
  return instance;
}

/** The demo analyst's access code, or null when the demo analyst is off. */
export function getDemoAiCode(): string | null {
  if (process.env.SOLUS_DEMO_AI?.trim() !== 'on' || !getAiConfig()) return null;
  const code = process.env.SOLUS_DEMO_AI_CODE?.trim();
  return code && code.length >= 8 ? code : null;
}
