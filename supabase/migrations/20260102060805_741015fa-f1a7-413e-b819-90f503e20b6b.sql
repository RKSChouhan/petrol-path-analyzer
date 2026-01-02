-- Delete any existing 'Manager' roles
DELETE FROM public.user_roles WHERE role = 'Manager';

-- Drop the dependent functions first
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Rename old enum
ALTER TYPE public.app_role RENAME TO app_role_old;

-- Create new enum without Manager
CREATE TYPE public.app_role AS ENUM ('Proprietor', 'Supervisor');

-- Update the column to use the new enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role 
  USING role::text::public.app_role;

-- Drop the old enum
DROP TYPE public.app_role_old;

-- Recreate the functions with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;