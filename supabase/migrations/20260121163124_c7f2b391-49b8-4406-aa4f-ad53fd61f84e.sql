-- Add shift and job columns to daily_attendance table
ALTER TABLE public.daily_attendance 
ADD COLUMN shift text DEFAULT 'Full',
ADD COLUMN job text DEFAULT 'Pump boy';

-- Add shift and job columns to employees table for default values
ALTER TABLE public.employees 
ADD COLUMN default_shift text DEFAULT 'Full',
ADD COLUMN default_job text DEFAULT 'Pump boy';