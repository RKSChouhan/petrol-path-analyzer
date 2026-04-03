
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cashier_group_count integer NOT NULL DEFAULT 2;

DROP FUNCTION IF EXISTS public.get_my_company();

CREATE OR REPLACE FUNCTION public.get_my_company()
 RETURNS TABLE(id uuid, name text, logo_url text, contact_phone text, petrol_price numeric, diesel_price numeric, pump_count_petrol integer, pump_count_diesel integer, default_expenses jsonb, default_debtors jsonb, cashier_group_count integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.logo_url, c.contact_phone,
         c.petrol_price, c.diesel_price,
         c.pump_count_petrol, c.pump_count_diesel,
         c.default_expenses, c.default_debtors,
         c.cashier_group_count,
         c.created_at, c.updated_at
  FROM public.companies c
  INNER JOIN public.user_companies uc ON uc.company_id = c.id
  WHERE uc.user_id = auth.uid()
  LIMIT 1
$$;
