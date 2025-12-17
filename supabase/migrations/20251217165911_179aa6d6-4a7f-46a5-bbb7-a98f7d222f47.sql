-- Drop the old unique constraint on sale_date only
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS daily_sales_sale_date_key;

-- Ensure the correct unique constraint exists for user_id, sale_date, entry_number
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS daily_sales_user_date_entry_unique;
ALTER TABLE public.daily_sales ADD CONSTRAINT daily_sales_user_date_entry_unique UNIQUE (user_id, sale_date, entry_number);