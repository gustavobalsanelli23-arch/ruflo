/**
 * Database types of the AI analyst (Parte 05), merged into `Database` in
 * ./database.ts. Mirrors supabase/migrations/20261030100000_ai_analyst.sql.
 * (Type aliases, not interfaces: supabase-js needs index-signature-compatible
 * shapes.)
 */

import type { Json } from './database';

export type AnalystMessageStatus = 'answered' | 'partial' | 'refused' | 'failed';
export type AiRequestStatus = 'started' | AnalystMessageStatus;

export type AnalystThreadRow = {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  opportunity_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalystMessageRow = {
  id: number;
  organization_id: string;
  thread_id: string;
  role: 'user' | 'analyst';
  question: string | null;
  answer: Json | null;
  answer_text: string | null;
  status: AnalystMessageStatus;
  failure: string | null;
  tool_calls: Json;
  grounding: Json | null;
  created_at: string;
};

export type AiRequestRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  kind: 'chat' | 'summary';
  status: AiRequestStatus;
  model: string | null;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  created_at: string;
  finished_at: string | null;
};

export type AiSummaryRow = {
  organization_id: string;
  period_key: '7d' | '30d' | '90d' | '12m' | 'ytd';
  data_signature: string;
  content: Json;
  model: string | null;
  created_by: string | null;
  created_at: string;
};

export type AiTables = {
  analyst_threads: {
    Row: AnalystThreadRow;
    Insert: { organization_id: string; title: string; opportunity_id?: string | null };
    Update: { title?: string };
    Relationships: [];
  };
  analyst_messages: {
    Row: AnalystMessageRow;
    Insert: {
      organization_id: string;
      thread_id: string;
      role: 'user' | 'analyst';
      question?: string | null;
      answer?: Json | null;
      answer_text?: string | null;
      status?: AnalystMessageStatus;
      failure?: string | null;
      tool_calls?: Json;
      grounding?: Json | null;
    };
    Update: Record<string, never>;
    Relationships: [];
  };
  ai_requests: { Row: AiRequestRow; Insert: Record<string, never>; Update: Record<string, never>; Relationships: [] };
  ai_summaries: { Row: AiSummaryRow; Insert: Record<string, never>; Update: Record<string, never>; Relationships: [] };
};

export type AiFunctions = {
  begin_ai_request: { Args: { p_organization_id: string; p_kind: 'chat' | 'summary' }; Returns: string };
  finish_ai_request: {
    Args: {
      p_request_id: string;
      p_status: AnalystMessageStatus;
      p_model: string | null;
      p_requests: number;
      p_input_tokens: number;
      p_output_tokens: number;
      p_cache_read_tokens: number;
      p_cache_write_tokens: number;
    };
    Returns: undefined;
  };
  save_ai_summary: {
    Args: { p_organization_id: string; p_period_key: AiSummaryRow['period_key']; p_data_signature: string; p_content: Json; p_model: string | null };
    Returns: undefined;
  };
};
