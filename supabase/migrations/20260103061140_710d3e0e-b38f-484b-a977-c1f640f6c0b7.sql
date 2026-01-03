-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on expenses" ON public.expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create debtors table
CREATE TABLE public.debtors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on debtors" ON public.debtors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add distilled_water_count column to oil_sales
ALTER TABLE public.oil_sales ADD COLUMN IF NOT EXISTS distilled_water_count INTEGER DEFAULT 0;