-- Create daily_attendance table to track which employees were present for each daily_sales entry
CREATE TABLE public.daily_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_sales_id UUID REFERENCES public.daily_sales(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(daily_sales_id, employee_id)
);

-- Enable Row Level Security
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_attendance
CREATE POLICY "Allow all users to read daily attendance"
ON public.daily_attendance FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert daily attendance"
ON public.daily_attendance FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update daily attendance"
ON public.daily_attendance FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete daily attendance"
ON public.daily_attendance FOR DELETE USING (true);