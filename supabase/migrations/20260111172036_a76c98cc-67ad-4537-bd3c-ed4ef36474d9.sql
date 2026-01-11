-- Create debtor ledger table to track cumulative debtor balances
CREATE TABLE public.debtor_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.debtor_ledger ENABLE ROW LEVEL SECURITY;

-- Create policies for full access (since we use a fixed station ID)
CREATE POLICY "Allow all operations on debtor_ledger" 
ON public.debtor_ledger 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_debtor_ledger_updated_at
BEFORE UPDATE ON public.debtor_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();