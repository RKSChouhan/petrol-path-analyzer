-- Fix: allow two entries per date by removing the legacy unique index on (user_id, sale_date)
DROP INDEX IF EXISTS public.unique_daily_sales_user_date;