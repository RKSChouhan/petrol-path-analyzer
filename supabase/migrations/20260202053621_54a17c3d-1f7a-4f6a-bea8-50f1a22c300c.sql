-- Storage Data Table for fuel station daily readings
CREATE TABLE public.storage_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  reading_date DATE NOT NULL,
  
  -- Generator fields
  generator_diesel_capacity NUMERIC DEFAULT 0,
  generator_dip NUMERIC DEFAULT 0,
  
  -- EB fields
  eb_meter NUMERIC DEFAULT 0,
  eb_unit NUMERIC DEFAULT 0,
  
  -- Fuel Reading fields
  petrol_kl NUMERIC DEFAULT 0,
  diesel_kl NUMERIC DEFAULT 0,
  oil_reading NUMERIC DEFAULT 0,
  two_t_oil_barrel_stock NUMERIC DEFAULT 0,
  empty_barrel NUMERIC DEFAULT 0,
  tvs_xl_meter NUMERIC DEFAULT 0,
  
  -- Petrol Density fields
  petrol_density_value NUMERIC DEFAULT 0,
  petrol_temperature NUMERIC DEFAULT 0,
  petrol_density_at_15c NUMERIC DEFAULT 0,
  
  -- Diesel Density fields
  diesel_density_value NUMERIC DEFAULT 0,
  diesel_temperature NUMERIC DEFAULT 0,
  diesel_density_at_15c NUMERIC DEFAULT 0,
  
  -- Load Detail fields
  load_capacity NUMERIC DEFAULT 0,
  density_checker NUMERIC DEFAULT 0,
  lorry_entry_time TIME,
  lorry_exit_time TIME,
  duration TEXT DEFAULT '',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, reading_date)
);

-- Enable RLS
ALTER TABLE public.storage_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view storage_readings"
ON public.storage_readings FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Elevated roles can insert storage_readings"
ON public.storage_readings FOR INSERT
TO authenticated
WITH CHECK (public.user_has_elevated_role());

CREATE POLICY "Elevated roles can update storage_readings"
ON public.storage_readings FOR UPDATE
TO authenticated
USING (public.user_has_elevated_role());

CREATE POLICY "Only Proprietor can delete storage_readings"
ON public.storage_readings FOR DELETE
TO authenticated
USING (public.user_is_proprietor());

-- Add trigger for updated_at
CREATE TRIGGER update_storage_readings_updated_at
BEFORE UPDATE ON public.storage_readings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();