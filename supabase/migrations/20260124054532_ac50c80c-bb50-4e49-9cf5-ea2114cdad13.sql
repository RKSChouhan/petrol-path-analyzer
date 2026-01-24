-- Create table for Fiserv bills
CREATE TABLE public.fiserv_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_date DATE NOT NULL,
  bill_time TIME NOT NULL,
  invoice_number TEXT NOT NULL,
  card_last_four TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fiserv_bills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all users to read fiserv_bills" 
ON public.fiserv_bills 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all users to insert fiserv_bills" 
ON public.fiserv_bills 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all users to update fiserv_bills" 
ON public.fiserv_bills 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all users to delete fiserv_bills" 
ON public.fiserv_bills 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fiserv_bills_updated_at
BEFORE UPDATE ON public.fiserv_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();