import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoutePoint {
  id: string;
  address: string;
  value: number;
  weight?: number;
}

interface RouteCalculationResult {
  totalDistanceKm: number;
  totalDurationHours: number;
  estimatedTollCost: number;
  routeDetails: Array<{
    from: string;
    to: string;
    distance: number;
    duration: number;
  }>;
  polyline?: string;
  geocodedPoints?: Array<{
    address: string;
    lat: number;
    lng: number;
  }>;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  summary?: string;
  vehicleRestrictions?: {
    axles: number;
    warnings: string[];
    avoidedRoads: string[];
  };
  routingEngine?: 'here' | 'tomtom' | 'google';
}

interface UseRouteCalculationReturn {
  calculateRoute: (
    pickups: RoutePoint[],
    deliveries: RoutePoint[],
    axles: number,
    cargoCapacity?: number
  ) => Promise<RouteCalculationResult | null>;
  loading: boolean;
  error: string | null;
  result: RouteCalculationResult | null;
}

export const useRouteCalculation = (): UseRouteCalculationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteCalculationResult | null>(null);

  const calculateRoute = useCallback(async (
    pickups: RoutePoint[],
    deliveries: RoutePoint[],
    axles: number,
    cargoCapacity?: number
  ): Promise<RouteCalculationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Filter out empty addresses
      const validPickups = pickups.filter(p => p.address.trim().length > 0);
      const validDeliveries = deliveries.filter(d => d.address.trim().length > 0);

      if (validPickups.length === 0 || validDeliveries.length === 0) {
        throw new Error('Informe pelo menos um endereço de coleta e um de entrega');
      }

      console.log('Calculating route with:', {
        pickups: validPickups.map(p => p.address),
        deliveries: validDeliveries.map(d => d.address),
        axles,
        cargoCapacity
      });

      const { data, error: fnError } = await supabase.functions.invoke('calculate-route', {
        body: {
          origins: validPickups.map(p => ({ address: p.address })),
          destinations: validDeliveries.map(d => ({ address: d.address })),
          axles,
          cargoCapacity,
        },
      });

      if (fnError) {
        console.error('Function error:', fnError);
        throw new Error(fnError.message || 'Erro ao calcular rota');
      }

      if (!data.success) {
        console.error('Route calculation failed:', data.error);
        throw new Error(data.error || 'Erro ao calcular rota');
      }

      const calculationResult: RouteCalculationResult = {
        totalDistanceKm: data.totalDistanceKm,
        totalDurationHours: data.totalDurationHours,
        estimatedTollCost: data.estimatedTollCost,
        routeDetails: data.routeDetails,
        polyline: data.polyline,
        geocodedPoints: data.geocodedPoints,
        bounds: data.bounds,
        summary: data.summary,
        vehicleRestrictions: data.vehicleRestrictions,
        routingEngine: data.routingEngine,
      };

      setResult(calculationResult);
      toast.success(`Rota calculada: ${data.totalDistanceKm} km`);
      
      return calculationResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Route calculation error:', errorMessage);
      setError(errorMessage);
      toast.error(`Erro ao calcular rota: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    calculateRoute,
    loading,
    error,
    result,
  };
};

export type { RouteCalculationResult, RoutePoint };
