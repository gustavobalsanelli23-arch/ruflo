/**
 * Database types in the shape produced by `supabase gen types typescript`.
 * Mirrors supabase/migrations; regenerate with `npm run db:types` once the
 * Supabase CLI is linked, and keep the two in sync in the same commit.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrgRole = 'owner' | 'admin' | 'analyst' | 'viewer';
export type ImportDataset = 'sales' | 'products' | 'inventory' | 'suppliers';
export type ImportStatus = 'pending' | 'validated' | 'processing' | 'completed' | 'with_errors' | 'failed' | 'canceled' | 'reverted';

import type { AiFunctions, AiTables } from './database-ai';
import type { AnalyticsFunctions, AnalyticsTables } from './database-analytics';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrgRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrgRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: OrgRole;
          token_hash: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: OrgRole;
          token_hash: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: OrgRole;
          token_hash?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_invitations_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      data_imports: {
        Row: {
          id: string;
          organization_id: string;
          dataset: ImportDataset;
          file_name: string;
          status: ImportStatus;
          record_count: number;
          error_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          storage_path: string | null;
          file_format: 'csv' | 'xlsx' | null;
          file_size: number | null;
          file_sha256: string | null;
          sheet_name: string | null;
          mapping: Json;
          options: Json;
          summary: Json;
          total_rows: number;
          valid_rows: number;
          warning_count: number;
          duplicate_rows: number;
          skipped_rows: number;
          batch_count: number | null;
          duplicate_policy: string | null;
          period_start: string | null;
          period_end: string | null;
          file_verified_at: string | null;
          validated_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          reverted_at: string | null;
          reverted_by: string | null;
          failure_reason: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          dataset: ImportDataset;
          file_name: string;
          status?: ImportStatus;
          record_count?: number;
          error_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          dataset?: ImportDataset;
          file_name?: string;
          status?: ImportStatus;
          record_count?: number;
          error_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'data_imports_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_imports_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    } & AnalyticsTables &
      AiTables;
    Views: { [_ in never]: never };
    Functions: AnalyticsFunctions &
      AiFunctions & {
      accept_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      check_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_invitation: {
        Args: { p_organization_id: string; p_email: string; p_role: OrgRole };
        Returns: { invitation_id: string; invitation_token: string; invitation_expires_at: string }[];
      };
      create_organization: {
        Args: { p_name: string };
        Returns: string;
      };
      get_invitation: {
        Args: { p_token: string };
        Returns: {
          organization_name: string;
          invited_role: OrgRole;
          email_hint: string;
          email_matches: boolean;
          invitation_status: 'pending' | 'accepted' | 'expired';
          invitation_expires_at: string;
        }[];
      };
    };
    Enums: {
      org_role: OrgRole;
      import_dataset: ImportDataset;
      import_status: ImportStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
