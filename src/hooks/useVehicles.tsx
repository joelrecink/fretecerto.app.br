import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];

export type SavedVehicle = VehicleRow;

export const useVehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<SavedVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = async () => {
    if (!user) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos');
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  const saveVehicle = async (vehicleData: Omit<VehicleInsert, 'user_id'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar veículos');
      return null;
    }

    const insertData: VehicleInsert = {
      ...vehicleData,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('vehicles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Erro ao salvar veículo');
      return null;
    }

    toast.success('Veículo salvo com sucesso!');
    fetchVehicles();
    return data;
  };

  const updateVehicle = async (id: string, vehicleData: Partial<VehicleRow>) => {
    const { data, error } = await supabase
      .from('vehicles')
      .update(vehicleData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Erro ao atualizar veículo');
      return null;
    }

    toast.success('Veículo atualizado!');
    fetchVehicles();
    return data;
  };

  const deleteVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Erro ao excluir veículo');
      return false;
    }

    toast.success('Veículo excluído');
    fetchVehicles();
    return true;
  };

  return {
    vehicles,
    loading,
    saveVehicle,
    updateVehicle,
    deleteVehicle,
    refetch: fetchVehicles,
  };
};
