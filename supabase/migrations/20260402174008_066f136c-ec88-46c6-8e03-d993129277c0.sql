
CREATE TABLE public.storage_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view storage_products" ON public.storage_products FOR SELECT USING (company_id = user_company_id());
CREATE POLICY "Elevated roles can insert storage_products" ON public.storage_products FOR INSERT WITH CHECK (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Elevated roles can update storage_products" ON public.storage_products FOR UPDATE USING (company_id = user_company_id() AND user_has_elevated_role());
CREATE POLICY "Only Proprietor can delete storage_products" ON public.storage_products FOR DELETE USING (company_id = user_company_id() AND user_is_proprietor());

ALTER TABLE public.companies ALTER COLUMN default_expenses SET DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ALTER COLUMN default_debtors SET DEFAULT '[]'::jsonb;
