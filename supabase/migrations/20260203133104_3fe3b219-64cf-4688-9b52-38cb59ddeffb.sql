-- Change density_checker column from numeric to text (for storing person name)
ALTER TABLE public.storage_readings 
ALTER COLUMN density_checker TYPE text USING density_checker::text;

-- Set default value
ALTER TABLE public.storage_readings 
ALTER COLUMN density_checker SET DEFAULT '';