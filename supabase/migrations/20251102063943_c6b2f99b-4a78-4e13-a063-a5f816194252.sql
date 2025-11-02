-- Add new fields for 2T oil readings to oil_sales table
ALTER TABLE public.oil_sales 
ADD COLUMN IF NOT EXISTS yesterday_reading numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS today_reading numeric DEFAULT 0;

-- Update the total_litres calculation logic will be handled in the application code
-- The total_litres will now represent the difference between today and yesterday readings
-- The total_amount will be calculated as total_litres * 330 (price per liter)