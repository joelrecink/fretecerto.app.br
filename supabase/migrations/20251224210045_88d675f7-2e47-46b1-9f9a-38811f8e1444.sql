-- Add daily free credit columns to user_credits
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS free_credits integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_credits_last_reset timestamp with time zone DEFAULT now();

-- Create system settings table for admin control
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system settings
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view system settings (for reading daily credit config)
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Insert default daily credit setting
INSERT INTO public.system_settings (key, value, description)
VALUES ('daily_free_credits', '1', 'Quantidade de créditos gratuitos diários por usuário')
ON CONFLICT (key) DO NOTHING;

-- Insert setting for daily credits enabled
INSERT INTO public.system_settings (key, value, description)
VALUES ('daily_free_credits_enabled', 'true', 'Habilitar créditos gratuitos diários')
ON CONFLICT (key) DO NOTHING;

-- Create function to get/reset daily credits
CREATE OR REPLACE FUNCTION public.get_user_credits_with_daily(_user_id uuid)
RETURNS TABLE(premium_balance integer, free_balance integer, total_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_credits_enabled boolean;
  daily_credits_amount integer;
  current_free integer;
  current_premium integer;
  last_reset timestamp with time zone;
BEGIN
  -- Get system settings
  SELECT (value = 'true') INTO daily_credits_enabled 
  FROM system_settings WHERE key = 'daily_free_credits_enabled';
  
  SELECT COALESCE(value::integer, 1) INTO daily_credits_amount 
  FROM system_settings WHERE key = 'daily_free_credits';
  
  -- Get or create user credits record
  SELECT uc.balance, uc.free_credits, uc.free_credits_last_reset
  INTO current_premium, current_free, last_reset
  FROM user_credits uc WHERE uc.user_id = _user_id;
  
  IF NOT FOUND THEN
    -- Create new record with daily credits if enabled
    INSERT INTO user_credits (user_id, balance, free_credits, free_credits_last_reset)
    VALUES (_user_id, 0, CASE WHEN daily_credits_enabled THEN daily_credits_amount ELSE 0 END, now())
    RETURNING balance, free_credits INTO current_premium, current_free;
    
    RETURN QUERY SELECT current_premium, current_free, (current_premium + current_free);
    RETURN;
  END IF;
  
  -- Check if we need to reset daily credits (new day)
  IF daily_credits_enabled AND (last_reset IS NULL OR last_reset::date < CURRENT_DATE) THEN
    UPDATE user_credits 
    SET free_credits = daily_credits_amount, free_credits_last_reset = now(), updated_at = now()
    WHERE user_id = _user_id;
    
    current_free := daily_credits_amount;
  END IF;
  
  RETURN QUERY SELECT current_premium, current_free, (current_premium + current_free);
END;
$$;

-- Update use_user_credits to use free credits first
CREATE OR REPLACE FUNCTION public.use_user_credits(_user_id uuid, _amount integer, _description text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  current_free INTEGER;
  to_deduct_free INTEGER;
  to_deduct_premium INTEGER;
BEGIN
  -- Get current balances
  SELECT balance, free_credits INTO current_balance, current_free
  FROM public.user_credits
  WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check total balance
  IF (current_balance + current_free) < _amount THEN
    RETURN FALSE;
  END IF;
  
  -- Use free credits first
  to_deduct_free := LEAST(_amount, current_free);
  to_deduct_premium := _amount - to_deduct_free;
  
  -- Update balances
  UPDATE public.user_credits
  SET 
    free_credits = free_credits - to_deduct_free,
    balance = balance - to_deduct_premium,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, status)
  VALUES (_user_id, -_amount, 'usage', _description, 'completed');
  
  RETURN TRUE;
END;
$$;

-- Add trigger for updated_at on system_settings
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();