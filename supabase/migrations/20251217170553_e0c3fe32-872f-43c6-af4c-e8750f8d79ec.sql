-- Drop the old unique constraint on user_id and sale_date only
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS unique_daily_sales_user_date;