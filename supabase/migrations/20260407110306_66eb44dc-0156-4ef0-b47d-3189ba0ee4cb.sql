DROP FUNCTION IF EXISTS public.get_my_company();

CREATE FUNCTION public.get_my_company()
RETURNS TABLE(
  cashier_group_count integer,
  contact_phone text,
  created_at timestamptz,
  default_debtors jsonb,
  default_expenses jsonb,
  diesel_price numeric,
  id uuid,
  logo_url text,
  name text,
  petrol_price numeric,
  pump_count_diesel integer,
  pump_count_petrol integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.cashier_group_count,
    c.contact_phone,
    c.created_at,
    c.default_debtors,
    c.default_expenses,
    c.diesel_price,
    c.id,
    c.logo_url,
    c.name,
    c.petrol_price,
    c.pump_count_diesel,
    c.pump_count_petrol,
    c.updated_at
  FROM companies c
  INNER JOIN user_companies uc ON uc.company_id = c.id
  WHERE uc.user_id = auth.uid()
  LIMIT 1;
$$;