-- Add saved_by column to daily_sales to track who saved the entry
ALTER TABLE public.daily_sales 
ADD COLUMN saved_by text;

-- Create repaid_debtors table
CREATE TABLE public.repaid_debtors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.repaid_debtors ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations on repaid_debtors" 
ON public.repaid_debtors 
FOR ALL 
USING (true)
WITH CHECK (true);