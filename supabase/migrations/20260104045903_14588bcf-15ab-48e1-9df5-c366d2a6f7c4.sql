-- Create table for lock settings
CREATE TABLE public.lock_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_locked boolean DEFAULT false,
  proprietor_locked boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default row
INSERT INTO public.lock_settings (id, supervisor_locked, proprietor_locked)
VALUES ('00000000-0000-0000-0000-000000000001', false, false);

-- Enable RLS
ALTER TABLE public.lock_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow read lock_settings"
ON public.lock_settings
FOR SELECT
TO authenticated
USING (true);

-- Only Proprietor can update
CREATE POLICY "Only Proprietor can update lock_settings"
ON public.lock_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'Proprietor'
  )
);