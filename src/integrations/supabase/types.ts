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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cash_denominations: {
        Row: {
          cashier_group: Database["public"]["Enums"]["cashier_group"]
          coins: number | null
          created_at: string | null
          daily_sales_id: string | null
          id: string
          rs_10: number | null
          rs_100: number | null
          rs_20: number | null
          rs_200: number | null
          rs_50: number | null
          rs_500: number | null
          total_cash: number | null
        }
        Insert: {
          cashier_group: Database["public"]["Enums"]["cashier_group"]
          coins?: number | null
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          rs_10?: number | null
          rs_100?: number | null
          rs_20?: number | null
          rs_200?: number | null
          rs_50?: number | null
          rs_500?: number | null
          total_cash?: number | null
        }
        Update: {
          cashier_group?: Database["public"]["Enums"]["cashier_group"]
          coins?: number | null
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          rs_10?: number | null
          rs_100?: number | null
          rs_20?: number | null
          rs_200?: number | null
          rs_50?: number | null
          rs_500?: number | null
          total_cash?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_denominations_daily_sales_id_fkey"
            columns: ["daily_sales_id"]
            isOneToOne: false
            referencedRelation: "daily_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales: {
        Row: {
          created_at: string | null
          entry_number: number
          id: string
          sale_date: string
          total_expenses: number | null
          total_income: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_number?: number
          id?: string
          sale_date: string
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_number?: number
          id?: string
          sale_date?: string
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oil_sales: {
        Row: {
          created_at: string | null
          daily_sales_id: string | null
          distilled_water: number | null
          id: string
          oil_count: number | null
          oil_name: string | null
          oil_price: number | null
          today_reading: number | null
          total_amount: number | null
          total_litres: number | null
          waste: number | null
          yesterday_reading: number | null
        }
        Insert: {
          created_at?: string | null
          daily_sales_id?: string | null
          distilled_water?: number | null
          id?: string
          oil_count?: number | null
          oil_name?: string | null
          oil_price?: number | null
          today_reading?: number | null
          total_amount?: number | null
          total_litres?: number | null
          waste?: number | null
          yesterday_reading?: number | null
        }
        Update: {
          created_at?: string | null
          daily_sales_id?: string | null
          distilled_water?: number | null
          id?: string
          oil_count?: number | null
          oil_name?: string | null
          oil_price?: number | null
          today_reading?: number | null
          total_amount?: number | null
          total_litres?: number | null
          waste?: number | null
          yesterday_reading?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oil_sales_daily_sales_id_fkey"
            columns: ["daily_sales_id"]
            isOneToOne: false
            referencedRelation: "daily_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          bharat_fleet_card: number | null
          cash_on_hand: number | null
          cashier_group: Database["public"]["Enums"]["cashier_group"]
          created_at: string | null
          daily_sales_id: string | null
          debit: number | null
          evening_locker: number | null
          fiserv: number | null
          gpay: number | null
          id: string
          phone_pay: number | null
          ubi: number | null
        }
        Insert: {
          bharat_fleet_card?: number | null
          cash_on_hand?: number | null
          cashier_group: Database["public"]["Enums"]["cashier_group"]
          created_at?: string | null
          daily_sales_id?: string | null
          debit?: number | null
          evening_locker?: number | null
          fiserv?: number | null
          gpay?: number | null
          id?: string
          phone_pay?: number | null
          ubi?: number | null
        }
        Update: {
          bharat_fleet_card?: number | null
          cash_on_hand?: number | null
          cashier_group?: Database["public"]["Enums"]["cashier_group"]
          created_at?: string | null
          daily_sales_id?: string | null
          debit?: number | null
          evening_locker?: number | null
          fiserv?: number | null
          gpay?: number | null
          id?: string
          phone_pay?: number | null
          ubi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_daily_sales_id_fkey"
            columns: ["daily_sales_id"]
            isOneToOne: false
            referencedRelation: "daily_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pump_readings: {
        Row: {
          closing_reading: number
          created_at: string | null
          daily_sales_id: string | null
          id: string
          opening_reading: number
          price_per_litre: number
          pump_number: number
          pump_type: Database["public"]["Enums"]["pump_type"]
          sales_amount: number | null
          sales_litres: number | null
        }
        Insert: {
          closing_reading: number
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          opening_reading: number
          price_per_litre: number
          pump_number: number
          pump_type: Database["public"]["Enums"]["pump_type"]
          sales_amount?: number | null
          sales_litres?: number | null
        }
        Update: {
          closing_reading?: number
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          opening_reading?: number
          price_per_litre?: number
          pump_number?: number
          pump_type?: Database["public"]["Enums"]["pump_type"]
          sales_amount?: number | null
          sales_litres?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pump_readings_daily_sales_id_fkey"
            columns: ["daily_sales_id"]
            isOneToOne: false
            referencedRelation: "daily_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
    }
    Enums: {
      app_role: "Proprietor" | "Manager" | "Supervisor"
      cashier_group: "group1" | "group2"
      pump_type: "petrol" | "diesel"
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
      app_role: ["Proprietor", "Manager", "Supervisor"],
      cashier_group: ["group1", "group2"],
      pump_type: ["petrol", "diesel"],
    },
  },
} as const
