import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  is_active: boolean;
  stripe_price_id: string | null;
  sort_order: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  description: string | null;
  stripe_session_id: string | null;
  package_name: string | null;
  package_price_cents: number | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export const useCredits = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!user) {
      setBalance(0);
      return;
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching balance:', error);
    }
    setBalance(data?.balance || 0);
  };

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching packages:', error);
    }
    setPackages((data as CreditPackage[]) || []);
  };

  const fetchTransactions = async () => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching transactions:', error);
    }
    setTransactions((data as CreditTransaction[]) || []);
  };

  const purchasePackage = async (packageId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No session found');
    }

    const response = await supabase.functions.invoke('create-pix-checkout', {
      body: { packageId },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (response.data?.url) {
      window.location.href = response.data.url;
    }

    return response.data;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBalance(), fetchPackages(), fetchTransactions()]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  return {
    balance,
    packages,
    transactions,
    loading,
    purchasePackage,
    refreshBalance: fetchBalance,
    refreshTransactions: fetchTransactions,
  };
};
