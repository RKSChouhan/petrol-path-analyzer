-- Add entry_number column to daily_sales to allow 2 entries per date
ALTER TABLE public.daily_sales 
ADD COLUMN entry_number integer NOT NULL DEFAULT 1;

-- Add constraint to ensure entry_number is 1 or 2
ALTER TABLE public.daily_sales 
ADD CONSTRAINT daily_sales_entry_number_check CHECK (entry_number IN (1, 2));

-- Create unique constraint for user_id, sale_date, entry_number combination
ALTER TABLE public.daily_sales 
ADD CONSTRAINT daily_sales_user_date_entry_unique UNIQUE (user_id, sale_date, entry_number);