-- Remove the unique constraint on oil_sales.daily_sales_id to allow multiple oil items per day
ALTER TABLE public.oil_sales DROP CONSTRAINT IF EXISTS oil_sales_daily_sales_id_key;

-- Add a composite index for better query performance
CREATE INDEX IF NOT EXISTS idx_oil_sales_daily_sales_id ON public.oil_sales(daily_sales_id);

-- Ensure foreign key constraint exists for data integrity
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'oil_sales_daily_sales_id_fkey'
  ) THEN
    ALTER TABLE public.oil_sales 
    ADD CONSTRAINT oil_sales_daily_sales_id_fkey 
    FOREIGN KEY (daily_sales_id) 
    REFERENCES public.daily_sales(id) 
    ON DELETE CASCADE;
  END IF;
END $$;