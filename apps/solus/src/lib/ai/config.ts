import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { EngineConfig } from './engine';

/**
 * AI settings, read on the server only (no NEXT_PUBLIC_ variable):
 *
 *   ANTHROPIC_API_KEY     key of the Claude API; without it the analyst is off
 *   SOLUS_AI_MODEL        model id, default claude-opus-5-5
 *   SOLUS_AI_EFFORT       low | medium | high, default medium
 *   SOLUS_DEMO_AI         "on" lets the analyst answer in /demo (fictitious data)
 *   SOLUS_DEMO_AI_CODE    access code required in /demo (8+ characters);
 *                         without it the demo analyst stays off
 *
 * The key is read here and passed to the SDK client; it never reaches a
 * browser bundle (`server-only`).
 */

const EFFORTS = new Set(['low', 'medium', 'high']);
const MODEL_ID = /^[a-z0-9][a-z0-9.-]{2,63}$/;

export function getAiConfig(): EngineConfig | null {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return null;
  const model = process.env.SOLUS_AI_MODEL?.trim();
  const effort = process.env.SOLUS_AI_EFFORT?.trim();
  return {
    model: model && MODEL_ID.test(model) ? model : 'claude-opus-5-5',
    effort: effort && EFFORTS.has(effort) ? (effort as EngineConfig['effort']) : 'medium',
    maxSteps: 6,
    softDeadlineMs: 40_000,
    maxTokens: 16_000,
  };
}

let client: Anthropic | null = null;

export function getAiClient(): Anthropic {
  // 2 tentativas automáticas em 429/5xx; o tempo total de cada chamada fica abaixo do limite da rota.
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim(), maxRetries: 2, timeout: 45_000 });
  return client;
}

/** The demo analyst's access code, or null when the demo analyst is off. */
export function getDemoAiCode(): string | null {
  if (process.env.SOLUS_DEMO_AI?.trim() !== 'on' || !getAiConfig()) return null;
  const code = process.env.SOLUS_DEMO_AI_CODE?.trim();
  return code && code.length >= 8 ? code : null;
}
