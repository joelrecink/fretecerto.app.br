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
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'daily';
  description: string | null;
  stripe_session_id: string | null;
  package_name: string | null;
  package_price_cents: number | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export interface CreditBalance {
  premium: number;
  free: number;
  total: number;
}

export const useCredits = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance>({ premium: 0, free: 0, total: 0 });
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!user) {
      setBalance({ premium: 0, free: 0, total: 0 });
      return;
    }

    const { data, error } = await supabase.rpc('get_user_credits_with_daily', {
      _user_id: user.id
    });

    if (error) {
      console.error('Error fetching balance:', error);
      setBalance({ premium: 0, free: 0, total: 0 });
      return;
    }

    if (data && data.length > 0) {
      setBalance({
        premium: data[0].premium_balance || 0,
        free: data[0].free_balance || 0,
        total: data[0].total_balance || 0
      });
    }
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
      const stripeWindow = window.open(response.data.url, '_blank');
      if (!stripeWindow) {
        window.location.href = response.data.url;
      }
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