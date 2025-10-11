-- Add oil_count column to oil_sales table
ALTER TABLE public.oil_sales 
ADD COLUMN oil_count INTEGER DEFAULT 0;