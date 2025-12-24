-- Remove a política RESTRICTIVE existente
DROP POLICY IF EXISTS "Anyone can view active packages" ON credit_packages;

-- Cria nova política PERMISSIVE para visualização pública de pacotes ativos
CREATE POLICY "Anyone can view active packages" 
ON credit_packages 
FOR SELECT 
TO public
USING (is_active = true);