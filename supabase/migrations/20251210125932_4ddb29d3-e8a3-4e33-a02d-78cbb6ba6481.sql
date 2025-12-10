-- Drop existing restrictive RLS policies and create permissive ones
-- This allows any authenticated or anonymous user to access their own data by user_id

-- Drop existing policies for daily_sales
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Users can view their own sales" ON public.daily_sales;

-- Create permissive policies for daily_sales (allow all operations)
CREATE POLICY "Allow all operations on daily_sales" 
ON public.daily_sales 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Drop existing policies for pump_readings
DROP POLICY IF EXISTS "Users can delete their pump readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Users can insert their pump readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Users can update their pump readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Users can view their pump readings" ON public.pump_readings;

-- Create permissive policies for pump_readings
CREATE POLICY "Allow all operations on pump_readings" 
ON public.pump_readings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Drop existing policies for oil_sales
DROP POLICY IF EXISTS "Users can delete their oil sales" ON public.oil_sales;
DROP POLICY IF EXISTS "Users can insert their oil sales" ON public.oil_sales;
DROP POLICY IF EXISTS "Users can update their oil sales" ON public.oil_sales;
DROP POLICY IF EXISTS "Users can view their oil sales" ON public.oil_sales;

-- Create permissive policies for oil_sales
CREATE POLICY "Allow all operations on oil_sales" 
ON public.oil_sales 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Drop existing policies for payment_methods
DROP POLICY IF EXISTS "Users can delete their payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert their payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can view their payment methods" ON public.payment_methods;

-- Create permissive policies for payment_methods
CREATE POLICY "Allow all operations on payment_methods" 
ON public.payment_methods 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Drop existing policies for cash_denominations
DROP POLICY IF EXISTS "Users can delete their cash denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Users can insert their cash denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Users can update their cash denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Users can view their cash denominations" ON public.cash_denominations;

-- Create permissive policies for cash_denominations
CREATE POLICY "Allow all operations on cash_denominations" 
ON public.cash_denominations 
FOR ALL 
USING (true)
WITH CHECK (true);