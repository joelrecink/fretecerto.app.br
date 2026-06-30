ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS payroll_charges_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_wait_hours_per_day numeric DEFAULT 2;