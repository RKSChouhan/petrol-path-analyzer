-- Complete Database Migration Script for Supabase
-- Run this entire script in your Supabase SQL Editor

-- =============================================
-- STEP 1: Create enum types
-- =============================================
CREATE TYPE pump_type AS ENUM ('petrol', 'diesel');
CREATE TYPE cashier_group AS ENUM ('group1', 'group2');

-- =============================================
-- STEP 2: Create main daily sales table
-- =============================================
CREATE TABLE public.daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sale_date DATE NOT NULL UNIQUE,
  total_income DECIMAL(12, 2) DEFAULT 0,
  total_expenses DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- STEP 3: Create pump readings table
-- =============================================
CREATE TABLE public.pump_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
  pump_type pump_type NOT NULL,
  pump_number INTEGER NOT NULL CHECK (pump_number BETWEEN 1 AND 4),
  opening_reading DECIMAL(12, 3) NOT NULL,
  closing_reading DECIMAL(12, 3) NOT NULL,
  sales_litres DECIMAL(12, 3) GENERATED ALWAYS AS (closing_reading - opening_reading) STORED,
  price_per_litre DECIMAL(10, 2) NOT NULL,
  sales_amount DECIMAL(12, 2) GENERATED ALWAYS AS ((closing_reading - opening_reading) * price_per_litre) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(daily_sales_id, pump_type, pump_number)
);

-- =============================================
-- STEP 4: Create payment methods table
-- =============================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
  cashier_group cashier_group NOT NULL,
  phone_pay DECIMAL(12, 2) DEFAULT 0,
  gpay DECIMAL(12, 2) DEFAULT 0,
  bharat_fleet_card DECIMAL(12, 2) DEFAULT 0,
  fiserv DECIMAL(12, 2) DEFAULT 0,
  debit DECIMAL(12, 2) DEFAULT 0,
  ubi DECIMAL(12, 2) DEFAULT 0,
  evening_locker DECIMAL(12, 2) DEFAULT 0,
  cash_on_hand DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(daily_sales_id, cashier_group)
);

-- =============================================
-- STEP 5: Create cash denominations table
-- =============================================
CREATE TABLE public.cash_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
  cashier_group cashier_group NOT NULL,
  rs_500 INTEGER DEFAULT 0,
  rs_200 INTEGER DEFAULT 0,
  rs_100 INTEGER DEFAULT 0,
  rs_50 INTEGER DEFAULT 0,
  rs_20 INTEGER DEFAULT 0,
  rs_10 INTEGER DEFAULT 0,
  coins DECIMAL(10, 2) DEFAULT 0,
  total_cash DECIMAL(12, 2) GENERATED ALWAYS AS (
    (rs_500 * 500) + (rs_200 * 200) + (rs_100 * 100) + 
    (rs_50 * 50) + (rs_20 * 20) + (rs_10 * 10) + coins
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(daily_sales_id, cashier_group)
);

-- =============================================
-- STEP 6: Create oil sales table
-- =============================================
CREATE TABLE public.oil_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
  oil_name TEXT,
  oil_price NUMERIC DEFAULT 0,
  oil_count INTEGER DEFAULT 0,
  yesterday_reading NUMERIC DEFAULT 0,
  today_reading NUMERIC DEFAULT 0,
  total_litres DECIMAL(10, 3) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  distilled_water DECIMAL(10, 2) DEFAULT 0,
  waste DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- STEP 7: Enable Row Level Security (RLS)
-- =============================================
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oil_sales ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 8: Create RLS Policies for daily_sales
-- =============================================
CREATE POLICY "Users can view their own sales"
  ON public.daily_sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales"
  ON public.daily_sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
  ON public.daily_sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON public.daily_sales FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- STEP 9: Create RLS Policies for pump_readings
-- =============================================
CREATE POLICY "Users can view their pump readings"
  ON public.pump_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = pump_readings.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their pump readings"
  ON public.pump_readings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = pump_readings.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their pump readings"
  ON public.pump_readings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = pump_readings.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their pump readings"
  ON public.pump_readings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = pump_readings.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

-- =============================================
-- STEP 10: Create RLS Policies for payment_methods
-- =============================================
CREATE POLICY "Users can view their payment methods"
  ON public.payment_methods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = payment_methods.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = payment_methods.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their payment methods"
  ON public.payment_methods FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = payment_methods.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their payment methods"
  ON public.payment_methods FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = payment_methods.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

-- =============================================
-- STEP 11: Create RLS Policies for cash_denominations
-- =============================================
CREATE POLICY "Users can view their cash denominations"
  ON public.cash_denominations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = cash_denominations.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their cash denominations"
  ON public.cash_denominations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = cash_denominations.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their cash denominations"
  ON public.cash_denominations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = cash_denominations.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their cash denominations"
  ON public.cash_denominations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = cash_denominations.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

-- =============================================
-- STEP 12: Create RLS Policies for oil_sales
-- =============================================
CREATE POLICY "Users can view their oil sales"
  ON public.oil_sales FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = oil_sales.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their oil sales"
  ON public.oil_sales FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = oil_sales.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their oil sales"
  ON public.oil_sales FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = oil_sales.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their oil sales"
  ON public.oil_sales FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sales
    WHERE daily_sales.id = oil_sales.daily_sales_id
    AND daily_sales.user_id = auth.uid()
  ));

-- =============================================
-- STEP 13: Create indexes for performance
-- =============================================
CREATE INDEX idx_daily_sales_user_date ON public.daily_sales(user_id, sale_date);
CREATE INDEX idx_pump_readings_daily_sales ON public.pump_readings(daily_sales_id);
CREATE INDEX idx_payment_methods_daily_sales ON public.payment_methods(daily_sales_id);
CREATE INDEX idx_cash_denominations_daily_sales ON public.cash_denominations(daily_sales_id);
CREATE INDEX idx_oil_sales_daily_sales ON public.oil_sales(daily_sales_id);

-- =============================================
-- STEP 14: Create trigger function for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================
-- STEP 15: Create trigger on daily_sales
-- =============================================
CREATE TRIGGER update_daily_sales_updated_at
  BEFORE UPDATE ON public.daily_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Your database schema is now ready!
-- Next steps:
-- 1. Go to Authentication > Settings in Supabase Dashboard
-- 2. Enable "Email Confirmations" and set to auto-confirm for development
-- 3. Your app is now ready to connect to this Supabase project
