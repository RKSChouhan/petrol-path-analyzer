
-- =============================================
-- PHASE 1: Multi-Tenant Database Foundation
-- =============================================

-- 1. Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  contact_phone TEXT,
  petrol_price NUMERIC(10,2) NOT NULL DEFAULT 101.88,
  diesel_price NUMERIC(10,2) NOT NULL DEFAULT 93.48,
  pump_count_petrol INTEGER NOT NULL DEFAULT 2 CHECK (pump_count_petrol BETWEEN 1 AND 4),
  pump_count_diesel INTEGER NOT NULL DEFAULT 2 CHECK (pump_count_diesel BETWEEN 1 AND 4),
  default_expenses JSONB DEFAULT '["Density test", "food & tea", "Drinking water"]'::jsonb,
  default_debtors JSONB DEFAULT '["Pandian"]'::jsonb,
  supervisor_password TEXT NOT NULL,
  proprietor_password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Create user_companies mapping table
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 3. Create helper functions
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_companies
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Secure function to get company data WITHOUT passwords
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS TABLE (
  id uuid, name text, logo_url text, contact_phone text,
  petrol_price numeric, diesel_price numeric,
  pump_count_petrol integer, pump_count_diesel integer,
  default_expenses jsonb, default_debtors jsonb,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.logo_url, c.contact_phone,
         c.petrol_price, c.diesel_price,
         c.pump_count_petrol, c.pump_count_diesel,
         c.default_expenses, c.default_debtors,
         c.created_at, c.updated_at
  FROM public.companies c
  INNER JOIN public.user_companies uc ON uc.company_id = c.id
  WHERE uc.user_id = auth.uid()
  LIMIT 1
$$;

-- 4. Add company_id to top-level data tables (nullable first for migration)
ALTER TABLE public.daily_sales ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.storage_readings ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.employees ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.fiserv_bills ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.bharat_fleet_bills ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.debtor_ledger ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.lock_settings ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- 5. Create default company and migrate ALL existing data
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  INSERT INTO public.companies (name, contact_phone, petrol_price, diesel_price,
    pump_count_petrol, pump_count_diesel, default_expenses, default_debtors,
    supervisor_password, proprietor_password)
  VALUES (
    'Sri MahaLingam Agency',
    '+91 82487 60240',
    101.88, 93.48, 2, 2,
    '["Density test", "food & tea", "Drinking water"]'::jsonb,
    '["Pandian"]'::jsonb,
    'temp_supervisor', 'temp_proprietor'
  )
  RETURNING id INTO default_company_id;

  UPDATE public.daily_sales SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.storage_readings SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.employees SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.fiserv_bills SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.bharat_fleet_bills SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.debtor_ledger SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.lock_settings SET company_id = default_company_id WHERE company_id IS NULL;

  INSERT INTO public.user_companies (user_id, company_id)
  SELECT id, default_company_id FROM auth.users
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- 6. Make company_id NOT NULL
ALTER TABLE public.daily_sales ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.storage_readings ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.employees ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.fiserv_bills ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.bharat_fleet_bills ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.debtor_ledger ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.lock_settings ALTER COLUMN company_id SET NOT NULL;

-- 7. Update unique constraints for multi-tenancy
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS daily_sales_sale_date_key;
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS daily_sales_user_id_sale_date_entry_number_key;
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS daily_sales_sale_date_entry_number_key;
ALTER TABLE public.daily_sales ADD CONSTRAINT daily_sales_company_date_entry_unique
  UNIQUE (company_id, sale_date, entry_number);

ALTER TABLE public.storage_readings DROP CONSTRAINT IF EXISTS storage_readings_reading_date_key;
ALTER TABLE public.storage_readings DROP CONSTRAINT IF EXISTS storage_readings_user_id_reading_date_key;
ALTER TABLE public.storage_readings ADD CONSTRAINT storage_readings_company_date_unique
  UNIQUE (company_id, reading_date);

ALTER TABLE public.lock_settings ADD CONSTRAINT lock_settings_company_unique
  UNIQUE (company_id);

-- 8. Create indexes
CREATE INDEX idx_daily_sales_company ON public.daily_sales(company_id);
CREATE INDEX idx_storage_readings_company ON public.storage_readings(company_id);
CREATE INDEX idx_employees_company ON public.employees(company_id);
CREATE INDEX idx_fiserv_bills_company ON public.fiserv_bills(company_id);
CREATE INDEX idx_bharat_fleet_bills_company ON public.bharat_fleet_bills(company_id);
CREATE INDEX idx_debtor_ledger_company ON public.debtor_ledger(company_id);
CREATE INDEX idx_lock_settings_company ON public.lock_settings(company_id);
CREATE INDEX idx_user_companies_user ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company ON public.user_companies(company_id);

-- =============================================
-- 9. RLS POLICIES: companies table
-- =============================================
-- Block direct SELECT (passwords are sensitive; use get_my_company() RPC instead)
CREATE POLICY "No direct select on companies"
  ON public.companies FOR SELECT USING (false);

CREATE POLICY "Authenticated can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Proprietor can update own company"
  ON public.companies FOR UPDATE
  USING (id = user_company_id() AND user_is_proprietor());

-- =============================================
-- 10. RLS POLICIES: user_companies table
-- =============================================
CREATE POLICY "Users can view own mapping"
  ON public.user_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mapping"
  ON public.user_companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 11. Drop ALL old RLS policies and create company-scoped ones
-- =============================================

-- --- daily_sales ---
DROP POLICY IF EXISTS "Authenticated users can view daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Elevated roles can insert daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Elevated roles can update daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Only Proprietor can delete daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Users can view their own sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.daily_sales;

CREATE POLICY "Company members can view daily_sales"
  ON public.daily_sales FOR SELECT
  USING (company_id = user_company_id());
CREATE POLICY "Elevated roles can insert daily_sales"
  ON public.daily_sales FOR INSERT
  WITH CHECK (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Elevated roles can update daily_sales"
  ON public.daily_sales FOR UPDATE
  USING (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Only Proprietor can delete daily_sales"
  ON public.daily_sales FOR DELETE
  USING (company_id = user_company_id() AND user_is_proprietor());

-- --- storage_readings ---
DROP POLICY IF EXISTS "Authenticated users can view storage_readings" ON public.storage_readings;
DROP POLICY IF EXISTS "Elevated roles can insert storage_readings" ON public.storage_readings;
DROP POLICY IF EXISTS "Elevated roles can update storage_readings" ON public.storage_readings;
DROP POLICY IF EXISTS "Only Proprietor can delete storage_readings" ON public.storage_readings;

CREATE POLICY "Company members can view storage_readings"
  ON public.storage_readings FOR SELECT
  USING (company_id = user_company_id());
CREATE POLICY "Elevated roles can insert storage_readings"
  ON public.storage_readings FOR INSERT
  WITH CHECK (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Elevated roles can update storage_readings"
  ON public.storage_readings FOR UPDATE
  USING (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Only Proprietor can delete storage_readings"
  ON public.storage_readings FOR DELETE
  USING (company_id = user_company_id() AND user_is_proprietor());

-- --- employees ---
DROP POLICY IF EXISTS "Users can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Users can create employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update employees" ON public.employees;
DROP POLICY IF EXISTS "Users can delete employees" ON public.employees;

CREATE POLICY "Company members can view employees"
  ON public.employees FOR SELECT USING (company_id = user_company_id());
CREATE POLICY "Company members can insert employees"
  ON public.employees FOR INSERT WITH CHECK (company_id = user_company_id());
CREATE POLICY "Company members can update employees"
  ON public.employees FOR UPDATE USING (company_id = user_company_id());
CREATE POLICY "Company members can delete employees"
  ON public.employees FOR DELETE USING (company_id = user_company_id());

-- --- fiserv_bills ---
DROP POLICY IF EXISTS "Allow all users to read fiserv_bills" ON public.fiserv_bills;
DROP POLICY IF EXISTS "Allow all users to insert fiserv_bills" ON public.fiserv_bills;
DROP POLICY IF EXISTS "Allow all users to update fiserv_bills" ON public.fiserv_bills;
DROP POLICY IF EXISTS "Allow all users to delete fiserv_bills" ON public.fiserv_bills;

CREATE POLICY "Company members can view fiserv_bills"
  ON public.fiserv_bills FOR SELECT USING (company_id = user_company_id());
CREATE POLICY "Company members can insert fiserv_bills"
  ON public.fiserv_bills FOR INSERT WITH CHECK (company_id = user_company_id());
CREATE POLICY "Company members can update fiserv_bills"
  ON public.fiserv_bills FOR UPDATE USING (company_id = user_company_id());
CREATE POLICY "Company members can delete fiserv_bills"
  ON public.fiserv_bills FOR DELETE USING (company_id = user_company_id());

-- --- bharat_fleet_bills ---
DROP POLICY IF EXISTS "Allow all users to read bharat_fleet_bills" ON public.bharat_fleet_bills;
DROP POLICY IF EXISTS "Allow all users to insert bharat_fleet_bills" ON public.bharat_fleet_bills;
DROP POLICY IF EXISTS "Allow all users to update bharat_fleet_bills" ON public.bharat_fleet_bills;
DROP POLICY IF EXISTS "Allow all users to delete bharat_fleet_bills" ON public.bharat_fleet_bills;

CREATE POLICY "Company members can view bharat_fleet_bills"
  ON public.bharat_fleet_bills FOR SELECT USING (company_id = user_company_id());
CREATE POLICY "Company members can insert bharat_fleet_bills"
  ON public.bharat_fleet_bills FOR INSERT WITH CHECK (company_id = user_company_id());
CREATE POLICY "Company members can update bharat_fleet_bills"
  ON public.bharat_fleet_bills FOR UPDATE USING (company_id = user_company_id());
CREATE POLICY "Company members can delete bharat_fleet_bills"
  ON public.bharat_fleet_bills FOR DELETE USING (company_id = user_company_id());

-- --- debtor_ledger ---
DROP POLICY IF EXISTS "Authenticated users can view debtor_ledger" ON public.debtor_ledger;
DROP POLICY IF EXISTS "Elevated roles can insert debtor_ledger" ON public.debtor_ledger;
DROP POLICY IF EXISTS "Elevated roles can update debtor_ledger" ON public.debtor_ledger;
DROP POLICY IF EXISTS "Only Proprietor can delete debtor_ledger" ON public.debtor_ledger;

CREATE POLICY "Company members can view debtor_ledger"
  ON public.debtor_ledger FOR SELECT USING (company_id = user_company_id());
CREATE POLICY "Elevated roles can insert debtor_ledger"
  ON public.debtor_ledger FOR INSERT
  WITH CHECK (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Elevated roles can update debtor_ledger"
  ON public.debtor_ledger FOR UPDATE
  USING (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Only Proprietor can delete debtor_ledger"
  ON public.debtor_ledger FOR DELETE
  USING (company_id = user_company_id() AND user_is_proprietor());

-- --- lock_settings ---
DROP POLICY IF EXISTS "Allow read lock_settings" ON public.lock_settings;
DROP POLICY IF EXISTS "Only Proprietor can update lock_settings" ON public.lock_settings;

CREATE POLICY "Company members can view lock_settings"
  ON public.lock_settings FOR SELECT USING (company_id = user_company_id());
CREATE POLICY "Only Proprietor can update lock_settings"
  ON public.lock_settings FOR UPDATE
  USING (company_id = user_company_id() AND user_is_proprietor());
CREATE POLICY "Company members can insert lock_settings"
  ON public.lock_settings FOR INSERT
  WITH CHECK (company_id = user_company_id());

-- --- pump_readings (child of daily_sales) ---
DROP POLICY IF EXISTS "Authenticated users can view pump_readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Elevated roles can insert pump_readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Elevated roles can update pump_readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Only Proprietor can delete pump_readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Users can view their pump readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Users can insert their pump readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Users can update their pump readings" ON public.pump_readings;
DROP POLICY IF EXISTS "Users can delete their pump readings" ON public.pump_readings;

CREATE POLICY "Company members can view pump_readings"
  ON public.pump_readings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = pump_readings.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can insert pump_readings"
  ON public.pump_readings FOR INSERT
  WITH CHECK (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = pump_readings.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can update pump_readings"
  ON public.pump_readings FOR UPDATE
  USING (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = pump_readings.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Only Proprietor can delete pump_readings"
  ON public.pump_readings FOR DELETE
  USING (user_is_proprietor() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = pump_readings.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- --- payment_methods (child of daily_sales) ---
DROP POLICY IF EXISTS "Authenticated users can view payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Elevated roles can insert payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Elevated roles can update payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Only Proprietor can delete payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can view their payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert their payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete their payment methods" ON public.payment_methods;

CREATE POLICY "Company members can view payment_methods"
  ON public.payment_methods FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = payment_methods.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can insert payment_methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = payment_methods.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can update payment_methods"
  ON public.payment_methods FOR UPDATE
  USING (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = payment_methods.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Only Proprietor can delete payment_methods"
  ON public.payment_methods FOR DELETE
  USING (user_is_proprietor() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = payment_methods.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- --- cash_denominations (child of daily_sales) ---
DROP POLICY IF EXISTS "Authenticated users can view cash_denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Elevated roles can insert cash_denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Elevated roles can update cash_denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Only Proprietor can delete cash_denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Users can view their cash denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Users can insert their cash denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Users can update their cash denominations" ON public.cash_denominations;
DROP POLICY IF EXISTS "Users can delete their cash denominations" ON public.cash_denominations;

CREATE POLICY "Company members can view cash_denominations"
  ON public.cash_denominations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = cash_denominations.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can insert cash_denominations"
  ON public.cash_denominations FOR INSERT
  WITH CHECK (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = cash_denominations.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can update cash_denominations"
  ON public.cash_denominations FOR UPDATE
  USING (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = cash_denominations.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Only Proprietor can delete cash_denominations"
  ON public.cash_denominations FOR DELETE
  USING (user_is_proprietor() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = cash_denominations.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- --- oil_sales (child of daily_sales) ---
DROP POLICY IF EXISTS "Authenticated users can view oil_sales" ON public.oil_sales;
DROP POLICY IF EXISTS "Elevated roles can insert oil_sales" ON public.oil_sales;
DROP POLICY IF EXISTS "Elevated roles can update oil_sales" ON public.oil_sales;
DROP POLICY IF EXISTS "Only Proprietor can delete oil_sales" ON public.oil_sales;

CREATE POLICY "Company members can view oil_sales"
  ON public.oil_sales FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = oil_sales.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can insert oil_sales"
  ON public.oil_sales FOR INSERT
  WITH CHECK (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = oil_sales.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can update oil_sales"
  ON public.oil_sales FOR UPDATE
  USING (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = oil_sales.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Only Proprietor can delete oil_sales"
  ON public.oil_sales FOR DELETE
  USING (user_is_proprietor() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = oil_sales.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- --- expenses (child of daily_sales) ---
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Elevated roles can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Elevated roles can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Only Proprietor can delete expenses" ON public.expenses;

CREATE POLICY "Company members can view expenses"
  ON public.expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = expenses.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = expenses.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can update expenses"
  ON public.expenses FOR UPDATE
  USING (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = expenses.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Only Proprietor can delete expenses"
  ON public.expenses FOR DELETE
  USING (user_is_proprietor() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = expenses.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- --- debtors (child of daily_sales) ---
DROP POLICY IF EXISTS "Authenticated users can view debtors" ON public.debtors;
DROP POLICY IF EXISTS "Elevated roles can insert debtors" ON public.debtors;
DROP POLICY IF EXISTS "Elevated roles can update debtors" ON public.debtors;
DROP POLICY IF EXISTS "Only Proprietor can delete debtors" ON public.debtors;

CREATE POLICY "Company members can view debtors"
  ON public.debtors FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can insert debtors"
  ON public.debtors FOR INSERT
  WITH CHECK (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can update debtors"
  ON public.debtors FOR UPDATE
  USING (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Only Proprietor can delete debtors"
  ON public.debtors FOR DELETE
  USING (user_is_proprietor() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- --- repaid_debtors (child of daily_sales) ---
DROP POLICY IF EXISTS "Authenticated users can view repaid_debtors" ON public.repaid_debtors;
DROP POLICY IF EXISTS "Elevated roles can insert repaid_debtors" ON public.repaid_debtors;
DROP POLICY IF EXISTS "Elevated roles can update repaid_debtors" ON public.repaid_debtors;
DROP POLICY IF EXISTS "Only Proprietor can delete repaid_debtors" ON public.repaid_debtors;

CREATE POLICY "Company members can view repaid_debtors"
  ON public.repaid_debtors FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = repaid_debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can insert repaid_debtors"
  ON public.repaid_debtors FOR INSERT
  WITH CHECK (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = repaid_debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Elevated roles can update repaid_debtors"
  ON public.repaid_debtors FOR UPDATE
  USING (user_has_elevated_role() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = repaid_debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Only Proprietor can delete repaid_debtors"
  ON public.repaid_debtors FOR DELETE
  USING (user_is_proprietor() AND EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = repaid_debtors.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- --- daily_attendance (child of daily_sales) ---
DROP POLICY IF EXISTS "Allow all users to read daily attendance" ON public.daily_attendance;
DROP POLICY IF EXISTS "Allow all users to insert daily attendance" ON public.daily_attendance;
DROP POLICY IF EXISTS "Allow all users to update daily attendance" ON public.daily_attendance;
DROP POLICY IF EXISTS "Allow all users to delete daily attendance" ON public.daily_attendance;

CREATE POLICY "Company members can view daily_attendance"
  ON public.daily_attendance FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = daily_attendance.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Company members can insert daily_attendance"
  ON public.daily_attendance FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = daily_attendance.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Company members can update daily_attendance"
  ON public.daily_attendance FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = daily_attendance.daily_sales_id AND daily_sales.company_id = user_company_id()));
CREATE POLICY "Company members can delete daily_attendance"
  ON public.daily_attendance FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.daily_sales WHERE daily_sales.id = daily_attendance.daily_sales_id AND daily_sales.company_id = user_company_id()));

-- 12. Add updated_at trigger for companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
