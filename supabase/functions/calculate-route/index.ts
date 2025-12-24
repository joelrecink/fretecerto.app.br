import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoutePoint {
  address: string;
  lat?: number;
  lng?: number;
}

interface RouteRequest {
  origins: RoutePoint[];
  destinations: RoutePoint[];
  axles: number;
  cargoCapacity?: number; // in tons
}

interface TollDetail {
  id: number;
  name: string;
  road: string;
  state: string;
  tagCost: number;
  cashCost: number;
  currency: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Invalid authentication token:', authError?.message);
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', user.id);

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const tollGuruApiKey = Deno.env.get('TOLLGURU_API_KEY');
    
    if (!googleApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      throw new Error('Google Maps API key not configured');
    }

    const { origins, destinations, axles, cargoCapacity } = await req.json() as RouteRequest;
    
    console.log('Calculating route for user:', user.id, { origins, destinations, axles, cargoCapacity });

    // Build all waypoints in order: origins -> destinations
    const allPoints = [...origins, ...destinations];
    
    if (allPoints.length < 2) {
      throw new Error('At least 2 points required for route calculation');
    }

    // Create waypoints string for the route
    const origin = allPoints[0].address;
    const destination = allPoints[allPoints.length - 1].address;
    const waypoints = allPoints.slice(1, -1).map(p => p.address);

    // Define road restrictions based on vehicle size (axles)
    // Heavy vehicles (6+ axles) should avoid steep roads and certain mountain passes
    const restrictedRoads: { [key: string]: { minAxles: number; description: string } } = {
      'Serra do Rio do Rastro': { minAxles: 6, description: 'Íngreme e perigosa para veículos pesados' },
      'SC-430': { minAxles: 6, description: 'Serra do Rio do Rastro - proibida para veículos pesados' },
      'Serra do Corvo Branco': { minAxles: 7, description: 'Estrada íngreme com curvas fechadas' },
      'SC-370': { minAxles: 7, description: 'Serra do Corvo Branco - restrita para veículos muito pesados' },
      'Rodovia da Morte': { minAxles: 5, description: 'Alto risco para veículos pesados' },
      'Serra das Araras': { minAxles: 7, description: 'Declive acentuado' },
      'Via Anchieta subida': { minAxles: 8, description: 'Restrições para veículos muito pesados' },
    };

    // Check for restrictions that apply to this vehicle
    const applicableRestrictions = Object.entries(restrictedRoads)
      .filter(([_, restriction]) => axles >= restriction.minAxles)
      .map(([road, restriction]) => ({ road, ...restriction }));

    console.log(`Vehicle has ${axles} axles. Applicable restrictions:`, applicableRestrictions);

    // Call Google Directions API with truck-friendly options
    // Use alternatives=true to get multiple routes and filter out restricted ones
    let directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${googleApiKey}&language=pt-BR&region=br`;
    
    if (waypoints.length > 0) {
      directionsUrl += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
    }

    // For heavy vehicles, request alternatives and avoid highways restrictions
    if (axles >= 6) {
      directionsUrl += '&alternatives=true';
    }

    console.log('Calling Google Directions API...');
    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();

    if (directionsData.status !== 'OK') {
      console.error('Directions API error:', directionsData.status, directionsData.error_message);
      throw new Error(`Google Directions API error: ${directionsData.status} - ${directionsData.error_message || 'Unknown error'}`);
    }

    // Filter routes to avoid restricted roads for heavy vehicles
    let selectedRoute = directionsData.routes[0];
    let routeWarnings: string[] = [];
    let avoidedRoutes: string[] = [];

    if (axles >= 6 && directionsData.routes.length > 1) {
      // Check each route for restricted roads
      for (const route of directionsData.routes) {
        const routeSummary = (route.summary || '').toLowerCase();
        const routeSteps = route.legs.flatMap((leg: any) => 
          leg.steps.map((step: any) => (step.html_instructions || '').toLowerCase())
        ).join(' ');
        const fullRouteText = `${routeSummary} ${routeSteps}`;

        let hasRestriction = false;
        for (const restriction of applicableRestrictions) {
          const roadLower = restriction.road.toLowerCase();
          if (fullRouteText.includes(roadLower)) {
            hasRestriction = true;
            avoidedRoutes.push(`${restriction.road}: ${restriction.description}`);
            console.log(`Route via ${route.summary} contains restricted road: ${restriction.road}`);
            break;
          }
        }

        if (!hasRestriction) {
          selectedRoute = route;
          console.log(`Selected alternative route via ${route.summary} (avoids restricted roads)`);
          break;
        }
      }

      // If all routes have restrictions, use the first one but add warnings
      if (avoidedRoutes.length === directionsData.routes.length) {
        console.warn('All available routes contain restricted roads for this vehicle');
        routeWarnings.push(`⚠️ ATENÇÃO: Veículo de ${axles} eixos pode ter restrições nesta rota`);
        for (const avoided of avoidedRoutes) {
          routeWarnings.push(`• ${avoided}`);
        }
      } else if (avoidedRoutes.length > 0) {
        routeWarnings.push(`✓ Rota otimizada para veículo de ${axles} eixos`);
        routeWarnings.push(`Trechos evitados: ${avoidedRoutes.map(r => r.split(':')[0]).join(', ')}`);
      }
    }

    const route = selectedRoute;
    const legs = route.legs;

    // Calculate total distance and duration
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    const routeDetails: Array<{from: string; to: string; distance: number; duration: number}> = [];

    for (const leg of legs) {
      totalDistanceMeters += leg.distance.value;
      totalDurationSeconds += leg.duration.value;
      routeDetails.push({
        from: leg.start_address,
        to: leg.end_address,
        distance: leg.distance.value / 1000, // km
        duration: leg.duration.value / 60, // minutes
      });
    }

    const totalDistanceKm = totalDistanceMeters / 1000;
    const totalDurationHours = totalDurationSeconds / 3600;

    // Get encoded polyline for map display
    const polyline = route.overview_polyline?.points || null;

    // Get geocoded coordinates for each point
    const geocodedPoints: Array<{address: string; lat: number; lng: number}> = [];
    
    // First point from start_location
    if (legs[0]) {
      geocodedPoints.push({
        address: legs[0].start_address,
        lat: legs[0].start_location.lat,
        lng: legs[0].start_location.lng,
      });
    }
    
    // All intermediate and end points from end_location
    for (const leg of legs) {
      geocodedPoints.push({
        address: leg.end_address,
        lat: leg.end_location.lat,
        lng: leg.end_location.lng,
      });
    }

    // Calculate tolls using TollGuru API if available
    let estimatedTollCost = 0;
    let tollDetails: TollDetail[] = [];
    let tollSource = 'estimated';

    if (tollGuruApiKey && polyline) {
      try {
        console.log('Calling TollGuru API for toll calculation...');
        
        // Map axles to TollGuru vehicle type
        // TollGuru vehicle types for trucks: 2AxlesTruck, 3AxlesTruck, 4AxlesTruck, 5AxlesTruck, 6AxlesTruck, 7AxlesTruck
        const vehicleType = axles >= 7 ? '7AxlesTruck' : 
                           axles >= 6 ? '6AxlesTruck' :
                           axles >= 5 ? '5AxlesTruck' :
                           axles >= 4 ? '4AxlesTruck' :
                           axles >= 3 ? '3AxlesTruck' : '2AxlesTruck';

        const tollGuruBody = {
          source: 'google',
          polyline: polyline,
          vehicle: {
            type: vehicleType,
            axles: axles,
            weight: cargoCapacity ? {
              value: cargoCapacity,
              unit: 'ton'
            } : undefined
          }
        };

        console.log('TollGuru request body:', JSON.stringify(tollGuruBody, null, 2));

        const tollGuruResponse = await fetch('https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': tollGuruApiKey,
          },
          body: JSON.stringify(tollGuruBody),
        });

        if (tollGuruResponse.ok) {
          const tollGuruData = await tollGuruResponse.json();
          console.log('TollGuru response status:', tollGuruResponse.status);
          
          if (tollGuruData.route && tollGuruData.route.costs) {
            // Get the tag cost (most common for trucks in Brazil)
            const costs = tollGuruData.route.costs;
            estimatedTollCost = costs.tag || costs.cash || costs.licensePlate || 0;
            
            // Convert to BRL if needed (TollGuru returns in local currency)
            // For Brazil, it should already be in BRL
            tollSource = 'tollguru';
            
            console.log('TollGuru toll costs:', costs);
            
            // Extract toll details
            if (tollGuruData.route.tolls && Array.isArray(tollGuruData.route.tolls)) {
              tollDetails = tollGuruData.route.tolls.map((toll: any) => ({
                id: toll.id,
                name: toll.name,
                road: toll.road || '',
                state: toll.state || '',
                tagCost: toll.tagCost || 0,
                cashCost: toll.cashCost || 0,
                currency: toll.currency || 'BRL',
              }));
            }
          } else {
            console.log('TollGuru: No tolls found on route or different response structure');
            console.log('TollGuru full response:', JSON.stringify(tollGuruData, null, 2));
          }
        } else {
          const errorText = await tollGuruResponse.text();
          console.error('TollGuru API error:', tollGuruResponse.status, errorText);
        }
      } catch (tollError) {
        console.error('Error calling TollGuru API:', tollError);
      }
    }

    // If TollGuru fails or is not configured, toll cost remains 0
    if (tollSource === 'estimated') {
      console.log('TollGuru not available or failed - toll cost will be 0 (only real data is used)');
      estimatedTollCost = 0;
      tollSource = 'unavailable';
    }

    const result = {
      success: true,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationHours: Math.round(totalDurationHours * 10) / 10,
      estimatedTollCost: Math.round(estimatedTollCost * 100) / 100,
      tollSource,
      tollDetails,
      routeDetails,
      polyline,
      geocodedPoints,
      bounds: route.bounds,
      summary: route.summary,
      vehicleRestrictions: {
        axles,
        warnings: routeWarnings,
        avoidedRoads: avoidedRoutes.map(r => r.split(':')[0]),
      },
    };

    console.log('Route calculation successful:', {
      distance: result.totalDistanceKm,
      duration: result.totalDurationHours,
      tolls: result.estimatedTollCost,
      tollSource: result.tollSource,
      tollCount: tollDetails.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in calculate-route function:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
