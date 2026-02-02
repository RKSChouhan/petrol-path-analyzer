-- ==============================================
-- SECURITY FIX: Prevent Role Self-Assignment
-- ==============================================

-- Drop the permissive INSERT and UPDATE policies on user_roles
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;

-- Keep the SELECT policy so users can read their own roles
-- (It already exists, but we'll recreate to ensure consistency)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ==============================================
-- SECURITY FIX: Role-Based RLS for Critical Tables
-- ==============================================

-- Helper function to check if current user has elevated role
CREATE OR REPLACE FUNCTION public.user_has_elevated_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('Proprietor', 'Supervisor')
  )
$$;

-- Helper function to check if current user is Proprietor
CREATE OR REPLACE FUNCTION public.user_is_proprietor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'Proprietor'
  )
$$;

-- ==============================================
-- daily_sales: Core financial records
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on daily_sales" ON public.daily_sales;

CREATE POLICY "Authenticated users can view daily_sales"
ON public.daily_sales FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert daily_sales"
ON public.daily_sales FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update daily_sales"
ON public.daily_sales FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete daily_sales"
ON public.daily_sales FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- pump_readings: Fuel pump sales data
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on pump_readings" ON public.pump_readings;

CREATE POLICY "Authenticated users can view pump_readings"
ON public.pump_readings FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert pump_readings"
ON public.pump_readings FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update pump_readings"
ON public.pump_readings FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete pump_readings"
ON public.pump_readings FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- payment_methods: Payment transaction breakdowns
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on payment_methods" ON public.payment_methods;

CREATE POLICY "Authenticated users can view payment_methods"
ON public.payment_methods FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert payment_methods"
ON public.payment_methods FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update payment_methods"
ON public.payment_methods FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete payment_methods"
ON public.payment_methods FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- cash_denominations: Detailed cash counting
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on cash_denominations" ON public.cash_denominations;

CREATE POLICY "Authenticated users can view cash_denominations"
ON public.cash_denominations FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert cash_denominations"
ON public.cash_denominations FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update cash_denominations"
ON public.cash_denominations FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete cash_denominations"
ON public.cash_denominations FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- oil_sales: Oil product sales
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on oil_sales" ON public.oil_sales;

CREATE POLICY "Authenticated users can view oil_sales"
ON public.oil_sales FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert oil_sales"
ON public.oil_sales FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update oil_sales"
ON public.oil_sales FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete oil_sales"
ON public.oil_sales FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- expenses: Business expense records
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on expenses" ON public.expenses;

CREATE POLICY "Authenticated users can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update expenses"
ON public.expenses FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete expenses"
ON public.expenses FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- debtors: Customer credit records
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on debtors" ON public.debtors;

CREATE POLICY "Authenticated users can view debtors"
ON public.debtors FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert debtors"
ON public.debtors FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update debtors"
ON public.debtors FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete debtors"
ON public.debtors FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- repaid_debtors: Debt repayment tracking
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on repaid_debtors" ON public.repaid_debtors;

CREATE POLICY "Authenticated users can view repaid_debtors"
ON public.repaid_debtors FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert repaid_debtors"
ON public.repaid_debtors FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update repaid_debtors"
ON public.repaid_debtors FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete repaid_debtors"
ON public.repaid_debtors FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- ==============================================
-- debtor_ledger: Full customer ledger
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on debtor_ledger" ON public.debtor_ledger;

CREATE POLICY "Authenticated users can view debtor_ledger"
ON public.debtor_ledger FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert debtor_ledger"
ON public.debtor_ledger FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update debtor_ledger"
ON public.debtor_ledger FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete debtor_ledger"
ON public.debtor_ledger FOR DELETE
TO authenticated
USING (public.user_is_proprietor());