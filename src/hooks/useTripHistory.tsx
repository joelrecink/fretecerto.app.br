import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type TripRow = Database['public']['Tables']['trip_history']['Row'];
type TripInsert = Database['public']['Tables']['trip_history']['Insert'];

export type TripRecord = TripRow;

export const useTripHistory = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('trip_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
      toast.error('Erro ao carregar histórico');
    } else {
      setTrips(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
  }, [user]);

  const saveTrip = async (tripData: Omit<TripInsert, 'user_id'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar viagens');
      return null;
    }

    const insertData: TripInsert = {
      ...tripData,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('trip_history')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error saving trip:', error);
      toast.error('Erro ao salvar viagem');
      return null;
    }

    toast.success('Viagem salva no histórico!');
    fetchTrips();
    return data;
  };

  const deleteTrip = async (id: string) => {
    const { error } = await supabase.from('trip_history').delete().eq('id', id);

    if (error) {
      console.error('Error deleting trip:', error);
      toast.error('Erro ao excluir viagem');
      return false;
    }

    toast.success('Viagem excluída');
    fetchTrips();
    return true;
  };

  return {
    trips,
    loading,
    saveTrip,
    deleteTrip,
    refetch: fetchTrips,
  };
};
