-- Tabela para armazenar saldo de créditos dos usuários
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para créditos
CREATE POLICY "Users can view their own credits"
ON public.user_credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credits"
ON public.user_credits FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all credits"
ON public.user_credits FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de histórico de transações de créditos
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  description TEXT,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  package_name TEXT,
  package_price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para transações
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.credit_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage transactions"
ON public.credit_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela para configuração de pacotes de créditos (admin configurable)
CREATE TABLE public.credit_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver pacotes ativos
CREATE POLICY "Anyone can view active packages"
ON public.credit_packages FOR SELECT
USING (is_active = true);

-- Admins podem gerenciar pacotes
CREATE POLICY "Admins can manage packages"
ON public.credit_packages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela para configuração segura do PIX (somente admin)
CREATE TABLE public.pix_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  beneficiary_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pix_config ENABLE ROW LEVEL SECURITY;

-- Somente admins podem ver e gerenciar configuração PIX
CREATE POLICY "Admins can view pix config"
ON public.pix_config FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage pix config"
ON public.pix_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at
BEFORE UPDATE ON public.credit_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pix_config_updated_at
BEFORE UPDATE ON public.pix_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir pacotes padrão
INSERT INTO public.credit_packages (name, credits, price_cents, sort_order) VALUES
('Básico', 10, 5000, 1),
('Popular', 50, 20000, 2),
('Profissional', 150, 50000, 3);

-- Função para adicionar créditos ao usuário (segura, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.add_user_credits(
  _user_id UUID,
  _amount INTEGER,
  _type TEXT DEFAULT 'purchase',
  _description TEXT DEFAULT NULL,
  _stripe_payment_intent_id TEXT DEFAULT NULL,
  _stripe_session_id TEXT DEFAULT NULL,
  _package_name TEXT DEFAULT NULL,
  _package_price_cents INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar ou atualizar saldo do usuário
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = user_credits.balance + _amount, updated_at = now();
  
  -- Registrar transação
  INSERT INTO public.credit_transactions (
    user_id, amount, type, description, 
    stripe_payment_intent_id, stripe_session_id, 
    package_name, package_price_cents, status
  )
  VALUES (
    _user_id, _amount, _type, _description,
    _stripe_payment_intent_id, _stripe_session_id,
    _package_name, _package_price_cents, 'completed'
  );
  
  RETURN TRUE;
END;
$$;

-- Função para usar créditos
CREATE OR REPLACE FUNCTION public.use_user_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Verificar saldo atual
  SELECT balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = _user_id;
  
  IF current_balance IS NULL OR current_balance < _amount THEN
    RETURN FALSE;
  END IF;
  
  -- Debitar créditos
  UPDATE public.user_credits
  SET balance = balance - _amount, updated_at = now()
  WHERE user_id = _user_id;
  
  -- Registrar transação
  INSERT INTO public.credit_transactions (user_id, amount, type, description, status)
  VALUES (_user_id, -_amount, 'usage', _description, 'completed');
  
  RETURN TRUE;
END;
$$;

-- Função para obter saldo do usuário
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(balance, 0) FROM public.user_credits WHERE user_id = _user_id
$$;