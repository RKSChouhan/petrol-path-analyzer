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
      bharat_fleet_bills: {
        Row: {
          account_no: string
          amount: number
          bill_date: string
          bill_time: string
          card_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_no: string
          amount?: number
          bill_date: string
          bill_time: string
          card_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_no?: string
          amount?: number
          bill_date?: string
          bill_time?: string
          card_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      daily_attendance: {
        Row: {
          created_at: string
          daily_sales_id: string | null
          employee_id: string | null
          employee_name: string
          id: string
          job: string | null
          shift: string | null
        }
        Insert: {
          created_at?: string
          daily_sales_id?: string | null
          employee_id?: string | null
          employee_name: string
          id?: string
          job?: string | null
          shift?: string | null
        }
        Update: {
          created_at?: string
          daily_sales_id?: string | null
          employee_id?: string | null
          employee_name?: string
          id?: string
          job?: string | null
          shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_attendance_daily_sales_id_fkey"
            columns: ["daily_sales_id"]
            isOneToOne: false
            referencedRelation: "daily_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales: {
        Row: {
          comment: string | null
          created_at: string | null
          entry_number: number
          id: string
          sale_date: string
          saved_by: string | null
          total_expenses: number | null
          total_income: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          entry_number?: number
          id?: string
          sale_date: string
          saved_by?: string | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          entry_number?: number
          id?: string
          sale_date?: string
          saved_by?: string | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      debtor_ledger: {
        Row: {
          amount: number
          bill_number: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          bill_number?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          bill_number?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debtors: {
        Row: {
          amount: number
          bill_number: string | null
          created_at: string | null
          daily_sales_id: string | null
          id: string
          name: string
        }
        Insert: {
          amount?: number
          bill_number?: string | null
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          name?: string
        }
        Update: {
          amount?: number
          bill_number?: string | null
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "debtors_daily_sales_id_fkey"
            columns: ["daily_sales_id"]
            isOneToOne: false
            referencedRelation: "daily_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          default_job: string | null
          default_shift: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_job?: string | null
          default_shift?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          default_job?: string | null
          default_shift?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          daily_sales_id: string | null
          id: string
          name: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          name?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_daily_sales_id_fkey"
            columns: ["daily_sales_id"]
            isOneToOne: false
            referencedRelation: "daily_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      fiserv_bills: {
        Row: {
          amount: number
          bill_date: string
          bill_time: string
          card_last_four: string
          created_at: string
          id: string
          invoice_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          bill_date: string
          bill_time: string
          card_last_four: string
          created_at?: string
          id?: string
          invoice_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_date?: string
          bill_time?: string
          card_last_four?: string
          created_at?: string
          id?: string
          invoice_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lock_settings: {
        Row: {
          id: string
          proprietor_locked: boolean | null
          supervisor_locked: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          proprietor_locked?: boolean | null
          supervisor_locked?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          proprietor_locked?: boolean | null
          supervisor_locked?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      oil_sales: {
        Row: {
          created_at: string | null
          daily_sales_id: string | null
          distilled_water: number | null
          distilled_water_count: number | null
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
          distilled_water_count?: number | null
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
          distilled_water_count?: number | null
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
      repaid_debtors: {
        Row: {
          amount: number
          created_at: string | null
          daily_sales_id: string | null
          id: string
          name: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          name?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          daily_sales_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "repaid_debtors_daily_sales_id_fkey"
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
      user_has_elevated_role: { Args: never; Returns: boolean }
      user_is_proprietor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "Proprietor" | "Supervisor"
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
      app_role: ["Proprietor", "Supervisor"],
      cashier_group: ["group1", "group2"],
      pump_type: ["petrol", "diesel"],
    },
  },
} as const
