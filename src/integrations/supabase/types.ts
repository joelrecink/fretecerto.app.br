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
      credit_packages: {
        Row: {
          created_at: string
          credits: number
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          package_name: string | null
          package_price_cents: number | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          package_name?: string | null
          package_price_cents?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          package_name?: string | null
          package_price_cents?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pix_config: {
        Row: {
          beneficiary_name: string
          created_at: string
          id: string
          is_active: boolean
          pix_key: string
          pix_key_type: string
          updated_at: string
        }
        Insert: {
          beneficiary_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          pix_key: string
          pix_key_type: string
          updated_at?: string
        }
        Update: {
          beneficiary_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          pix_key?: string
          pix_key_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      trip_history: {
        Row: {
          created_at: string
          deliveries: Json
          driver_commission_cost: number
          estimated_fixed_cost: number | null
          estimated_fuel_cost: number
          estimated_maintenance_cost: number
          estimated_toll_cost: number
          id: string
          license_plate: string | null
          net_profit: number
          pickups: Json
          route_suggestions: string | null
          total_distance_km: number
          total_duration_days: number
          total_duration_hours: number
          total_freight_income: number
          user_id: string
          vehicle_id: string | null
          viability_message: string | null
          viability_score: string
        }
        Insert: {
          created_at?: string
          deliveries?: Json
          driver_commission_cost: number
          estimated_fixed_cost?: number | null
          estimated_fuel_cost: number
          estimated_maintenance_cost: number
          estimated_toll_cost: number
          id?: string
          license_plate?: string | null
          net_profit: number
          pickups?: Json
          route_suggestions?: string | null
          total_distance_km: number
          total_duration_days: number
          total_duration_hours: number
          total_freight_income: number
          user_id: string
          vehicle_id?: string | null
          viability_message?: string | null
          viability_score: string
        }
        Update: {
          created_at?: string
          deliveries?: Json
          driver_commission_cost?: number
          estimated_fixed_cost?: number | null
          estimated_fuel_cost?: number
          estimated_maintenance_cost?: number
          estimated_toll_cost?: number
          id?: string
          license_plate?: string | null
          net_profit?: number
          pickups?: Json
          route_suggestions?: string | null
          total_distance_km?: number
          total_duration_days?: number
          total_duration_hours?: number
          total_freight_income?: number
          user_id?: string
          vehicle_id?: string | null
          viability_message?: string | null
          viability_score?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          free_credits: number
          free_credits_last_reset: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          free_credits?: number
          free_credits_last_reset?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          free_credits?: number
          free_credits_last_reset?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          annual_depreciation_rate: number | null
          asset_value: number | null
          axles: number
          cargo_capacity: number
          created_at: string
          current_odometer: number | null
          driver_commission_percentage: number | null
          driver_salary_include_13th: boolean | null
          driver_salary_monthly: number | null
          driving_hours_per_day: number | null
          filter_change_interval_km: number | null
          fuel_consumption: number
          fuel_price: number
          id: string
          insurance_yearly: number | null
          last_filter_change_cost: number | null
          last_oil_change_cost: number | null
          license_plate: string
          model_name: string | null
          oil_change_interval_km: number | null
          ref_tire_lifespan_new: number | null
          ref_tire_lifespan_remold: number | null
          ref_tire_price_new: number | null
          ref_tire_price_remold: number | null
          registration_yearly: number | null
          tire_drive_qty_new: number | null
          tire_drive_qty_remold: number | null
          tire_steer_qty_new: number | null
          tire_steer_qty_remold: number | null
          tire_trailer_qty_new: number | null
          tire_trailer_qty_remold: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_depreciation_rate?: number | null
          asset_value?: number | null
          axles?: number
          cargo_capacity?: number
          created_at?: string
          current_odometer?: number | null
          driver_commission_percentage?: number | null
          driver_salary_include_13th?: boolean | null
          driver_salary_monthly?: number | null
          driving_hours_per_day?: number | null
          filter_change_interval_km?: number | null
          fuel_consumption?: number
          fuel_price?: number
          id?: string
          insurance_yearly?: number | null
          last_filter_change_cost?: number | null
          last_oil_change_cost?: number | null
          license_plate: string
          model_name?: string | null
          oil_change_interval_km?: number | null
          ref_tire_lifespan_new?: number | null
          ref_tire_lifespan_remold?: number | null
          ref_tire_price_new?: number | null
          ref_tire_price_remold?: number | null
          registration_yearly?: number | null
          tire_drive_qty_new?: number | null
          tire_drive_qty_remold?: number | null
          tire_steer_qty_new?: number | null
          tire_steer_qty_remold?: number | null
          tire_trailer_qty_new?: number | null
          tire_trailer_qty_remold?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_depreciation_rate?: number | null
          asset_value?: number | null
          axles?: number
          cargo_capacity?: number
          created_at?: string
          current_odometer?: number | null
          driver_commission_percentage?: number | null
          driver_salary_include_13th?: boolean | null
          driver_salary_monthly?: number | null
          driving_hours_per_day?: number | null
          filter_change_interval_km?: number | null
          fuel_consumption?: number
          fuel_price?: number
          id?: string
          insurance_yearly?: number | null
          last_filter_change_cost?: number | null
          last_oil_change_cost?: number | null
          license_plate?: string
          model_name?: string | null
          oil_change_interval_km?: number | null
          ref_tire_lifespan_new?: number | null
          ref_tire_lifespan_remold?: number | null
          ref_tire_price_new?: number | null
          ref_tire_price_remold?: number | null
          registration_yearly?: number | null
          tire_drive_qty_new?: number | null
          tire_drive_qty_remold?: number | null
          tire_steer_qty_new?: number | null
          tire_steer_qty_remold?: number | null
          tire_trailer_qty_new?: number | null
          tire_trailer_qty_remold?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_credits: {
        Args: {
          _amount: number
          _description?: string
          _package_name?: string
          _package_price_cents?: number
          _stripe_payment_intent_id?: string
          _stripe_session_id?: string
          _type?: string
          _user_id: string
        }
        Returns: boolean
      }
      get_user_credit_balance: { Args: { _user_id: string }; Returns: number }
      get_user_credits_with_daily: {
        Args: { _user_id: string }
        Returns: {
          free_balance: number
          premium_balance: number
          total_balance: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      use_user_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
