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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      game_logs: {
        Row: {
          created_at: string
          id: number
          level: string
          message: string
          player_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          level: string
          message: string
          player_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          level?: string
          message?: string
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          auth_id: string | null
          avatar_emoji: string
          avatar_url: string | null
          balance: number
          created_at: string
          display_name: string
          id: string
          referral_code: string
          referred_by: string | null
          status: string
        }
        Insert: {
          auth_id?: string | null
          avatar_emoji?: string
          avatar_url?: string | null
          balance?: number
          created_at?: string
          display_name: string
          id?: string
          referral_code: string
          referred_by?: string | null
          status?: string
        }
        Update: {
          auth_id?: string | null
          avatar_emoji?: string
          avatar_url?: string | null
          balance?: number
          created_at?: string
          display_name?: string
          id?: string
          referral_code?: string
          referred_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_tables: {
        Row: {
          big_blind: number
          bot_level: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          max_buy_in: number
          min_bet: number
          min_buy_in: number
          name: string
          rake_percent: number | null
          small_blind: number
        }
        Insert: {
          big_blind: number
          bot_level?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_buy_in: number
          min_bet: number
          min_buy_in: number
          name: string
          rake_percent?: number | null
          small_blind: number
        }
        Update: {
          big_blind?: number
          bot_level?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_buy_in?: number
          min_bet?: number
          min_buy_in?: number
          name?: string
          rake_percent?: number | null
          small_blind?: number
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          account_name: string
          account_number: string
          created_at: string
          display_order: number
          id: string
          image_data: string | null
          is_active: boolean
          label: string
          method: string
          qr_payload: string
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string
          display_order?: number
          id?: string
          image_data?: string | null
          is_active?: boolean
          label: string
          method: string
          qr_payload?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string
          display_order?: number
          id?: string
          image_data?: string | null
          is_active?: boolean
          label?: string
          method?: string
          qr_payload?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sound_preferences: {
        Row: {
          card_volume: number
          chip_volume: number
          muted: boolean
          table_volume: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_volume?: number
          chip_volume?: number
          muted?: boolean
          table_volume?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_volume?: number
          chip_volume?: number
          muted?: boolean
          table_volume?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      table_game_states: {
        Row: {
          bot_level: string
          next_at: string
          player_id: string
          session_id: string
          state: Json
          table_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          bot_level?: string
          next_at?: string
          player_id: string
          session_id: string
          state: Json
          table_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          bot_level?: string
          next_at?: string
          player_id?: string
          session_id?: string
          state?: Json
          table_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_game_states_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_game_states_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_game_states_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions: {
        Row: {
          buy_in: number
          cashed_out: number | null
          closed_at: string | null
          id: string
          opened_at: string
          player_id: string
          status: string
        }
        Insert: {
          buy_in: number
          cashed_out?: number | null
          closed_at?: string | null
          id?: string
          opened_at?: string
          player_id: string
          status?: string
        }
        Update: {
          buy_in?: number
          cashed_out?: number | null
          closed_at?: string | null
          id?: string
          opened_at?: string
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_details: string
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          player_id: string
          proof_url: string | null
          qr_code_id: string | null
          referred_player_id: string | null
          resolved_at: string | null
          status: string
          type: string
        }
        Insert: {
          account_details: string
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          player_id: string
          proof_url?: string | null
          qr_code_id?: string | null
          referred_player_id?: string | null
          resolved_at?: string | null
          status?: string
          type: string
        }
        Update: {
          account_details?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          player_id?: string
          proof_url?: string | null
          qr_code_id?: string | null
          referred_player_id?: string | null
          resolved_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_referred_player_id_fkey"
            columns: ["referred_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_balance: {
        Args: { p_balance: number; p_player: string }
        Returns: undefined
      }
      admin_set_player_status: {
        Args: { p_player: string; p_status: string }
        Returns: undefined
      }
      admin_set_qr_image: {
        Args: { p_id: string; p_image: string }
        Returns: undefined
      }
      admin_set_setting: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      admin_update_qr_details: {
        Args: {
          p_account_name: string
          p_account_number: string
          p_id: string
          p_label: string
        }
        Returns: undefined
      }
      admin_update_table_rules: {
        Args: { p_bot_level: string; p_rake: number; p_table_id: string }
        Returns: undefined
      }
      assert_admin: { Args: never; Returns: undefined }
      current_player_id: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_event: {
        Args: { p_level: string; p_message: string; p_player: string }
        Returns: undefined
      }
      my_referral_count: { Args: never; Returns: number }
      my_referral_earnings: { Args: never; Returns: number }
      referral_code_exists: { Args: { p_code: string }; Returns: boolean }
      resolve_transaction: {
        Args: { p_decision: string; p_id: string; p_note?: string }
        Returns: undefined
      }
      server_buy_in: {
        Args: { p_amount: number; p_auth: string; p_table_id: string }
        Returns: string
      }
      server_cash_out: {
        Args: { p_amount: number; p_session: string }
        Returns: number
      }
      update_profile: {
        Args: {
          p_avatar_emoji?: string
          p_avatar_url?: string
          p_display_name?: string
          p_player: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
