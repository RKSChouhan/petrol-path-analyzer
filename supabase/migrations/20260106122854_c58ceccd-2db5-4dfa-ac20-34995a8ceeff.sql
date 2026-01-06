-- Add comment field to daily_sales table
ALTER TABLE public.daily_sales ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT NULL;