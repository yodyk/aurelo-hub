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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          external_links: Json | null
          hours_logged: number | null
          id: string
          last_session_date: string | null
          lifetime_revenue: number | null
          model: string
          monthly_earnings: number | null
          name: string
          rate: number
          retainer_remaining: number | null
          retainer_total: number | null
          show_portal_costs: boolean
          slug: string
          status: string
          true_hourly_rate: number | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_links?: Json | null
          hours_logged?: number | null
          id?: string
          last_session_date?: string | null
          lifetime_revenue?: number | null
          model?: string
          monthly_earnings?: number | null
          name: string
          rate?: number
          retainer_remaining?: number | null
          retainer_total?: number | null
          show_portal_costs?: boolean
          slug: string
          status?: string
          true_hourly_rate?: number | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_links?: Json | null
          hours_logged?: number | null
          id?: string
          last_session_date?: string | null
          lifetime_revenue?: number | null
          model?: string
          monthly_earnings?: number | null
          name?: string
          rate?: number
          retainer_remaining?: number | null
          retainer_total?: number | null
          show_portal_costs?: boolean
          slug?: string
          status?: string
          true_hourly_rate?: number | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          next_number: number
          workspace_id: string
        }
        Insert: {
          next_number?: number
          workspace_id: string
        }
        Update: {
          next_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_email: string | null
          client_id: string
          client_name: string | null
          created_at: string
          created_from_sessions: string[] | null
          currency: string
          due_date: string | null
          from_address: string | null
          from_email: string | null
          from_name: string | null
          id: string
          issued_date: string | null
          line_items: Json
          notes: string | null
          number: string
          paid_date: string | null
          payment_terms: string | null
          project_id: string | null
          project_name: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_url: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_email?: string | null
          client_id: string
          client_name?: string | null
          created_at?: string
          created_from_sessions?: string[] | null
          currency?: string
          due_date?: string | null
          from_address?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          issued_date?: string | null
          line_items?: Json
          notes?: string | null
          number: string
          paid_date?: string | null
          payment_terms?: string | null
          project_id?: string | null
          project_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_url?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_email?: string | null
          client_id?: string
          client_name?: string | null
          created_at?: string
          created_from_sessions?: string[] | null
          currency?: string
          due_date?: string | null
          from_address?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          issued_date?: string | null
          line_items?: Json
          notes?: string | null
          number?: string
          paid_date?: string | null
          payment_terms?: string | null
          project_id?: string | null
          project_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_url?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          is_resolved: boolean
          project_id: string | null
          project_name: string | null
          tags: string[] | null
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_resolved?: boolean
          project_id?: string | null
          project_name?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_resolved?: boolean
          project_id?: string | null
          project_name?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          email: string
          id: string
          invited_at: string
          invited_by: string
          role: string
          workspace_id: string
        }
        Insert: {
          email: string
          id?: string
          invited_at?: string
          invited_by: string
          role?: string
          workspace_id: string
        }
        Update: {
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tokens: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          id: string
          token: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          id?: string
          token: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          id?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_amount: number | null
          budget_type: string | null
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          external_links: Json | null
          hours: number | null
          id: string
          name: string
          revenue: number | null
          start_date: string | null
          status: string
          total_value: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          budget_amount?: number | null
          budget_type?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          external_links?: Json | null
          hours?: number | null
          id?: string
          name: string
          revenue?: number | null
          start_date?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          budget_amount?: number | null
          budget_type?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          external_links?: Json | null
          hours?: number | null
          id?: string
          name?: string
          revenue?: number | null
          start_date?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          allocation_type: string | null
          billable: boolean
          client_id: string
          created_at: string
          date: string
          duration: number
          id: string
          project_id: string | null
          revenue: number
          task: string | null
          timer_end: string | null
          timer_start: string | null
          work_tags: string[] | null
          workspace_id: string
        }
        Insert: {
          allocation_type?: string | null
          billable?: boolean
          client_id: string
          created_at?: string
          date: string
          duration?: number
          id?: string
          project_id?: string | null
          revenue?: number
          task?: string | null
          timer_end?: string | null
          timer_start?: string | null
          work_tags?: string[] | null
          workspace_id: string
        }
        Update: {
          allocation_type?: string | null
          billable?: boolean
          client_id?: string
          created_at?: string
          date?: string
          duration?: number
          id?: string
          project_id?: string | null
          revenue?: number
          task?: string | null
          timer_end?: string | null
          timer_start?: string | null
          work_tags?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          email: string
          id: string
          invited_at: string | null
          joined_at: string | null
          name: string | null
          role: string
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          email: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          name?: string | null
          role?: string
          status?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          email?: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          name?: string | null
          role?: string
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          data: Json
          id: string
          section: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          data?: Json
          id?: string
          section: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          data?: Json
          id?: string
          section?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          is_trial: boolean
          name: string
          owner_email: string | null
          owner_id: string
          plan_activated_at: string
          plan_id: string
          plan_period_end: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_trial?: boolean
          name: string
          owner_email?: string | null
          owner_id: string
          plan_activated_at?: string
          plan_id?: string
          plan_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_trial?: boolean
          name?: string
          owner_email?: string | null
          owner_id?: string
          plan_activated_at?: string
          plan_id?: string
          plan_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      api_keys_safe: {
        Row: {
          created_at: string | null
          id: string | null
          key_masked: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          key_masked?: never
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          key_masked?: never
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_workspace_ids: { Args: never; Returns: string[] }
      recalculate_all_client_aggregates: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      recalculate_client_aggregates: {
        Args: { p_client_id: string }
        Returns: undefined
      }
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
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
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
