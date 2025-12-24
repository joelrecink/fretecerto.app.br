-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  license_plate TEXT NOT NULL,
  model_name TEXT,
  axles INTEGER NOT NULL DEFAULT 6,
  fuel_consumption NUMERIC NOT NULL DEFAULT 2.5,
  fuel_price NUMERIC NOT NULL DEFAULT 6.50,
  cargo_capacity NUMERIC NOT NULL DEFAULT 32,
  driving_hours_per_day INTEGER DEFAULT 9,
  driver_commission_percentage NUMERIC DEFAULT 10,
  driver_salary_monthly NUMERIC,
  driver_salary_include_13th BOOLEAN DEFAULT true,
  asset_value NUMERIC,
  annual_depreciation_rate NUMERIC,
  insurance_yearly NUMERIC,
  registration_yearly NUMERIC,
  ref_tire_price_new NUMERIC,
  ref_tire_lifespan_new NUMERIC,
  ref_tire_price_remold NUMERIC,
  ref_tire_lifespan_remold NUMERIC,
  tire_steer_qty_new INTEGER,
  tire_steer_qty_remold INTEGER,
  tire_drive_qty_new INTEGER,
  tire_drive_qty_remold INTEGER,
  tire_trailer_qty_new INTEGER,
  tire_trailer_qty_remold INTEGER,
  oil_change_interval_km NUMERIC,
  last_oil_change_cost NUMERIC,
  filter_change_interval_km NUMERIC,
  last_filter_change_cost NUMERIC,
  current_odometer NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicles
CREATE POLICY "Users can view their own vehicles"
ON public.vehicles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vehicles"
ON public.vehicles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
ON public.vehicles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
ON public.vehicles FOR DELETE
USING (auth.uid() = user_id);

-- Trip history table
CREATE TABLE public.trip_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  license_plate TEXT,
  
  -- Route data
  pickups JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliveries JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Results
  total_distance_km NUMERIC NOT NULL,
  total_duration_hours NUMERIC NOT NULL,
  total_duration_days INTEGER NOT NULL,
  estimated_fuel_cost NUMERIC NOT NULL,
  estimated_toll_cost NUMERIC NOT NULL,
  driver_commission_cost NUMERIC NOT NULL,
  estimated_maintenance_cost NUMERIC NOT NULL,
  estimated_fixed_cost NUMERIC,
  total_freight_income NUMERIC NOT NULL,
  net_profit NUMERIC NOT NULL,
  viability_score TEXT NOT NULL,
  viability_message TEXT,
  route_suggestions TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trip_history
ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_history
CREATE POLICY "Users can view their own trips"
ON public.trip_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips"
ON public.trip_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
ON public.trip_history FOR DELETE
USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for auto-update timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();