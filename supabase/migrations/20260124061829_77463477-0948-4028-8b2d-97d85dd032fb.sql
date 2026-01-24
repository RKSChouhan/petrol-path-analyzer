-- Create table for Bharat Fleet Card bills
CREATE TABLE public.bharat_fleet_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_date DATE NOT NULL,
  bill_time TIME NOT NULL,
  account_no TEXT NOT NULL,
  card_id TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bharat_fleet_bills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all users to read bharat_fleet_bills" 
ON public.bharat_fleet_bills 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all users to insert bharat_fleet_bills" 
ON public.bharat_fleet_bills 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all users to update bharat_fleet_bills" 
ON public.bharat_fleet_bills 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all users to delete bharat_fleet_bills" 
ON public.bharat_fleet_bills 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bharat_fleet_bills_updated_at
BEFORE UPDATE ON public.bharat_fleet_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();