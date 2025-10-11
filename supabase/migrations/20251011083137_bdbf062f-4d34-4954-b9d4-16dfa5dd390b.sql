-- Add oil name and price columns to oil_sales table
ALTER TABLE public.oil_sales 
ADD COLUMN oil_name TEXT,
ADD COLUMN oil_price NUMERIC DEFAULT 0;