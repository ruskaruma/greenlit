export type ScriptStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "overdue";

export type ChaserStatus =
  | "pending_hitl"
  | "draft_saved"
  | "approved"
  | "edited"
  | "rejected"
  | "sent";

export type MemoryType =
  | "feedback"
  | "approval"
  | "rejection"
  | "behavioral_pattern"
  | "chaser_sent"
  | "client_response";

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  whatsapp_number: string | null;
  preferred_channel: string;
  instagram_handle: string | null;
  youtube_channel_id: string | null;
  avg_response_hours: number | null;
  total_scripts: number;
  approved_count: number;
  rejected_count: number;
  changes_requested_count: number;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  title: string;
  content: string;
  client_id: string;
  status: ScriptStatus;
  review_token: string;
  client_feedback: string | null;
  sent_at: string | null;
  reviewed_at: string | null;
  due_date: string | null;
  expires_at: string | null;
  version: number;
  platform: string | null;
  assigned_writer: string | null;
  review_channel: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScriptWithClient extends Script {
  client: Client;
}

export interface Chaser {
  id: string;
  script_id: string;
  client_id: string;
  draft_content: string;
  status: ChaserStatus;
  team_lead_edits: string | null;
  hitl_state: Record<string, unknown> | null;
  sent_at: string | null;
  created_at: string;
}

export interface ChaserWithRelations extends Chaser {
  script: Script;
  client: Client;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ClientMemory {
  id: string;
  client_id: string;
  content: string;
  embedding: number[] | null;
  memory_type: MemoryType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: {
          id?: string;
          name: string;
          email: string;
          company?: string | null;
          whatsapp_number?: string | null;
          preferred_channel?: string;
          instagram_handle?: string | null;
          youtube_channel_id?: string | null;
          avg_response_hours?: number | null;
          total_scripts?: number;
          approved_count?: number;
          rejected_count?: number;
          changes_requested_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string;
          company?: string | null;
          whatsapp_number?: string | null;
          preferred_channel?: string;
          instagram_handle?: string | null;
          youtube_channel_id?: string | null;
          avg_response_hours?: number | null;
          total_scripts?: number;
          approved_count?: number;
          rejected_count?: number;
          changes_requested_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      scripts: {
        Row: Script;
        Insert: {
          id?: string;
          title: string;
          content: string;
          client_id: string;
          status?: ScriptStatus;
          review_token?: string;
          client_feedback?: string | null;
          sent_at?: string | null;
          reviewed_at?: string | null;
          due_date?: string | null;
          expires_at?: string | null;
          version?: number;
          platform?: string | null;
          assigned_writer?: string | null;
          review_channel?: string;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          client_id?: string;
          status?: ScriptStatus;
          review_token?: string;
          client_feedback?: string | null;
          sent_at?: string | null;
          reviewed_at?: string | null;
          due_date?: string | null;
          expires_at?: string | null;
          version?: number;
          platform?: string | null;
          assigned_writer?: string | null;
          review_channel?: string;
          archived?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scripts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      chasers: {
        Row: Chaser;
        Insert: {
          id?: string;
          script_id: string;
          client_id: string;
          draft_content: string;
          status?: ChaserStatus;
          team_lead_edits?: string | null;
          hitl_state?: Record<string, unknown> | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          script_id?: string;
          client_id?: string;
          draft_content?: string;
          status?: ChaserStatus;
          team_lead_edits?: string | null;
          hitl_state?: Record<string, unknown> | null;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chasers_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chasers_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_log: {
        Row: AuditLog;
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          entity_type?: string;
          entity_id?: string;
          action?: string;
          actor?: string;
          metadata?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      client_memories: {
        Row: ClientMemory;
        Insert: {
          id?: string;
          client_id: string;
          content: string;
          embedding?: number[] | null;
          memory_type: MemoryType;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          content?: string;
          embedding?: number[] | null;
          memory_type?: MemoryType;
          metadata?: Record<string, unknown> | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_memories_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
