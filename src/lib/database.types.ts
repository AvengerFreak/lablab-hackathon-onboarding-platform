export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          hackathon_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          hackathon_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          hackathon_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathons: {
        Row: {
          created_at: string
          discord_server_id: string | null
          end_date: string | null
          github_org: string | null
          id: string
          name: string
          slug: string
          start_date: string | null
          welcome_message: string | null
          // New fields for enhanced hackathon creation
          program: string | null
          challenge_description: string | null
          rules: Json | null
          checklist_runbook: Json | null
          partners: Json | null
          prizes: Json | null
          community_config: Json | null
          social_config: Json | null
          submission_rules: Json | null
          judging_criteria: Json | null
          event_schedule: Json | null
          guest_speakers: Json | null
          year: number | null
          repo_visibility: "private" | "public" | null
          credit_allocations: Json | null
        }
        Insert: {
          created_at?: string
          discord_server_id?: string | null
          end_date?: string | null
          github_org?: string | null
          id?: string
          name: string
          slug: string
          start_date?: string | null
          welcome_message?: string | null
          // New fields
          program?: string | null
          challenge_description?: string | null
          rules?: Json | null
          checklist_runbook?: Json | null
          partners?: Json | null
          prizes?: Json | null
          community_config?: Json | null
          social_config?: Json | null
          submission_rules?: Json | null
          judging_criteria?: Json | null
          event_schedule?: Json | null
          guest_speakers?: Json | null
          year?: number | null
          repo_visibility?: "private" | "public" | null
          credit_allocations?: Json | null
        }
        Update: {
          created_at?: string
          discord_server_id?: string | null
          end_date?: string | null
          github_org?: string | null
          id?: string
          name?: string
          slug?: string
          start_date?: string | null
          welcome_message?: string | null
          // New fields
          program?: string | null
          challenge_description?: string | null
          rules?: Json | null
          checklist_runbook?: Json | null
          partners?: Json | null
          prizes?: Json | null
          community_config?: Json | null
          social_config?: Json | null
          submission_rules?: Json | null
          judging_criteria?: Json | null
          event_schedule?: Json | null
          guest_speakers?: Json | null
          year?: number | null
          repo_visibility?: "private" | "public" | null
          credit_allocations?: Json | null
        }
        Relationships: []
      }
      hackathon_checklist_items: {
        Row: {
          id: string
          hackathon_id: string
          step_name: string
          description: string
          is_reusable: boolean
          is_required: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          hackathon_id: string
          step_name: string
          description: string
          is_reusable?: boolean
          is_required?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          hackathon_id?: string
          step_name?: string
          description?: string
          is_reusable?: boolean
          is_required?: boolean
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_checklist_items_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_integrations: {
        Row: {
          id: string
          hackathon_id: string
          partner_name: string
          integration_type: string
          endpoint_url: string | null
          api_key: string | null
          credit_amount: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          hackathon_id: string
          partner_name: string
          integration_type: string
          endpoint_url?: string | null
          api_key?: string | null
          credit_amount?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          hackathon_id?: string
          partner_name?: string
          integration_type?: string
          endpoint_url?: string | null
          api_key?: string | null
          credit_amount?: number | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_integrations_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_credits: {
        Row: {
          id: string
          participant_id: string
          hackathon_id: string
          partner_name: string
          credit_amount: number
          allocated_at: string
          used_at: string | null
          transaction_id: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          hackathon_id: string
          partner_name: string
          credit_amount: number
          allocated_at?: string
          used_at?: string | null
          transaction_id?: string | null
        }
        Update: {
          id?: string
          participant_id?: string
          hackathon_id?: string
          partner_name?: string
          credit_amount?: number
          allocated_at?: string
          used_at?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_credits_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_credits_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_meetings: {
        Row: {
          id: string
          hackathon_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string | null
          meeting_link: string | null
          google_calendar_event_id: string | null
          is_required: boolean
          created_at: string
        }
        Insert: {
          id?: string
          hackathon_id: string
          title: string
          description?: string | null
          start_time: string
          end_time?: string | null
          meeting_link?: string | null
          google_calendar_event_id?: string | null
          is_required?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          hackathon_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string | null
          meeting_link?: string | null
          google_calendar_event_id?: string | null
          is_required?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_meetings_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_meeting_invites: {
        Row: {
          id: string
          participant_id: string
          meeting_id: string
          google_calendar_invite_sent: boolean
          google_calendar_invite_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          meeting_id: string
          google_calendar_invite_sent?: boolean
          google_calendar_invite_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          meeting_id?: string
          google_calendar_invite_sent?: boolean
          google_calendar_invite_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_meeting_invites_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "event_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_meeting_invites_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          hackathon_id: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          hackathon_id?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          hackathon_id?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_hackathons: {
        Row: {
          created_at: string
          hackathon_id: string
          id: string
          organizer_id: string
        }
        Insert: {
          created_at?: string
          hackathon_id: string
          id?: string
          organizer_id: string
        }
        Update: {
          created_at?: string
          hackathon_id?: string
          id?: string
          organizer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_hackathons_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_hackathons_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          google_calendar_connected: boolean
          google_calendar_token: Json | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          google_calendar_connected?: boolean
          google_calendar_token?: Json | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          google_calendar_connected?: boolean
          google_calendar_token?: Json | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          auth_user_id: string | null
          created_at: string
          discord_username: string | null
          email: string
          github_username: string | null
          hackathon_id: string
          id: string
          name: string
          steps_completed: Json
          team_id: string | null
          google_calendar_email: string | null
          google_calendar_invite_sent: boolean
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          discord_username?: string | null
          email: string
          github_username?: string | null
          hackathon_id: string
          id?: string
          name: string
          steps_completed?: Json
          team_id?: string | null
          google_calendar_email?: string | null
          google_calendar_invite_sent?: boolean
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          discord_username?: string | null
          email?: string
          github_username?: string | null
          hackathon_id?: string
          id?: string
          name?: string
          steps_completed?: Json
          team_id?: string | null
          google_calendar_email?: string | null
          google_calendar_invite_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "participants_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          discord_channel_id: string | null
          github_repo_url: string | null
          hackathon_id: string
          id: string
          is_approved: boolean
          mentor_discord_username: string | null
          mentor_name: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discord_channel_id?: string | null
          github_repo_url?: string | null
          hackathon_id: string
          id?: string
          is_approved?: boolean
          mentor_discord_username?: string | null
          mentor_name?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discord_channel_id?: string | null
          github_repo_url?: string | null
          hackathon_id?: string
          id?: string
          is_approved?: boolean
          mentor_discord_username?: string | null
          mentor_name?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
