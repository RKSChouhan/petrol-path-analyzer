-- Fix function search path security warning
-- Drop trigger first, then function, then recreate with proper search_path

DROP TRIGGER IF EXISTS update_daily_sales_updated_at ON public.daily_sales;
DROP FUNCTION IF EXISTS update_updated_at_column();

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

CREATE TRIGGER update_daily_sales_updated_at
  BEFORE UPDATE ON public.daily_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();