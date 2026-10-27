import { demoRepository } from '@/demo/repository';
import type { SolusRepository } from './repository';

export const IS_DEMO = true;

/**
 * Phase 01 always serves the demonstration repository. Phase 02 resolves the
 * signed-in organization here and returns a Supabase-backed implementation.
 */
export function getRepository(): SolusRepository {
  return demoRepository;
}

export type { SolusRepository } from './repository';
