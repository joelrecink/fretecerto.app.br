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
  vehicleWeight?: number; // total vehicle weight in kg
  vehicleHeight?: number; // height in meters
  vehicleWidth?: number;  // width in meters
  vehicleLength?: number; // length in meters
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

// Geocode address using Google Geocoding API
async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-BR&region=br`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      };
    }
    console.error('Geocode failed for:', address, data.status);
    return null;
  } catch (error) {
    console.error('Geocode error:', error);
    return null;
  }
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

    const tomtomApiKey = Deno.env.get('TOMTOM_API_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const tollGuruApiKey = Deno.env.get('TOLLGURU_API_KEY');
    
    if (!tomtomApiKey && !googleApiKey) {
      console.error('No routing API key configured');
      throw new Error('No routing API configured');
    }

    const { 
      origins, 
      destinations, 
      axles, 
      cargoCapacity,
      vehicleWeight,
      vehicleHeight,
      vehicleWidth,
      vehicleLength 
    } = await req.json() as RouteRequest;
    
    console.log('Calculating route for user:', user.id, { origins, destinations, axles, cargoCapacity });

    // Build all waypoints in order: origins -> destinations
    const allPoints = [...origins, ...destinations];
    
    if (allPoints.length < 2) {
      throw new Error('At least 2 points required for route calculation');
    }

    // Geocode all addresses first
    const geocodedPoints: Array<{address: string; lat: number; lng: number}> = [];
    for (const point of allPoints) {
      if (point.lat && point.lng) {
        geocodedPoints.push({ address: point.address, lat: point.lat, lng: point.lng });
      } else if (googleApiKey) {
        const coords = await geocodeAddress(point.address, googleApiKey);
        if (coords) {
          geocodedPoints.push({ address: point.address, ...coords });
        } else {
          throw new Error(`Could not geocode address: ${point.address}`);
        }
      } else {
        throw new Error('Cannot geocode without Google Maps API key');
      }
    }

    let totalDistanceKm = 0;
    let totalDurationHours = 0;
    let routeDetails: Array<{from: string; to: string; distance: number; duration: number}> = [];
    let polyline: string | null = null;
    let routeWarnings: string[] = [];
    let avoidedRoutes: string[] = [];
    let bounds: any = null;
    let summary = '';

    // TomTom Truck Routing (preferred for heavy vehicles)
    if (tomtomApiKey && axles >= 3) {
      console.log('Using TomTom Truck Routing API for heavy vehicle');
      
      try {
        // Build waypoints for TomTom
        const locations = geocodedPoints.map(p => `${p.lat},${p.lng}`).join(':');
        
        // Calculate vehicle specifications based on axles
        const defaultWeight = 7500 + (axles - 2) * 8000; // Base weight + per axle
        const weight = vehicleWeight || defaultWeight;
        const height = vehicleHeight || 4.0; // Default 4m for trucks
        const width = vehicleWidth || 2.55; // Default 2.55m (BR limit)
        const length = vehicleLength || (axles <= 4 ? 14 : axles <= 6 ? 18.15 : 19.8); // BR limits
        
        // TomTom Calculate Route API for trucks
        const tomtomUrl = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`);
        tomtomUrl.searchParams.append('key', tomtomApiKey);
        tomtomUrl.searchParams.append('traffic', 'true');
        tomtomUrl.searchParams.append('travelMode', 'truck');
        tomtomUrl.searchParams.append('vehicleWeight', weight.toString());
        tomtomUrl.searchParams.append('vehicleAxleWeight', Math.round(weight / axles).toString());
        tomtomUrl.searchParams.append('vehicleHeight', (height * 100).toString()); // cm
        tomtomUrl.searchParams.append('vehicleWidth', (width * 100).toString()); // cm
        tomtomUrl.searchParams.append('vehicleLength', (length * 100).toString()); // cm
        tomtomUrl.searchParams.append('vehicleMaxSpeed', '90'); // Max speed for trucks in Brazil
        tomtomUrl.searchParams.append('vehicleEngineType', 'diesel');
        tomtomUrl.searchParams.append('vehicleLoadType', 'otherHazmatGeneral');
        tomtomUrl.searchParams.append('hilliness', 'normal');
        tomtomUrl.searchParams.append('windingness', 'normal');
        tomtomUrl.searchParams.append('avoid', 'unpavedRoads');
        tomtomUrl.searchParams.append('routeType', 'fastest');
        tomtomUrl.searchParams.append('instructionsType', 'text');
        tomtomUrl.searchParams.append('language', 'pt-BR');

        console.log('TomTom API URL:', tomtomUrl.toString().replace(tomtomApiKey, 'REDACTED'));
        
        const tomtomResponse = await fetch(tomtomUrl.toString());
        
        if (tomtomResponse.ok) {
          const tomtomData = await tomtomResponse.json();
          
          if (tomtomData.routes && tomtomData.routes[0]) {
            const route = tomtomData.routes[0];
            const routeSummary = route.summary;
            
            totalDistanceKm = routeSummary.lengthInMeters / 1000;
            totalDurationHours = routeSummary.travelTimeInSeconds / 3600;
            
            // Extract route details per leg
            if (route.legs) {
              for (let i = 0; i < route.legs.length; i++) {
                const leg = route.legs[i];
                routeDetails.push({
                  from: geocodedPoints[i]?.address || `Ponto ${i + 1}`,
                  to: geocodedPoints[i + 1]?.address || `Ponto ${i + 2}`,
                  distance: leg.summary.lengthInMeters / 1000,
                  duration: leg.summary.travelTimeInSeconds / 60,
                });
              }
            }

            // Get polyline from TomTom (convert to Google-compatible format)
            if (route.legs) {
              const allPoints: string[] = [];
              for (const leg of route.legs) {
                if (leg.points) {
                  for (const point of leg.points) {
                    allPoints.push(`${point.latitude},${point.longitude}`);
                  }
                }
              }
              // For now, we'll use the points directly - TomTom returns lat/lng pairs
              polyline = allPoints.join('|');
            }

            // Check for vehicle restrictions in the route
            if (routeSummary.noTrafficIncidentOnRoute === false) {
              routeWarnings.push('⚠️ Possíveis incidentes de tráfego na rota');
            }
            
            // Build bounds
            const lats = geocodedPoints.map(p => p.lat);
            const lngs = geocodedPoints.map(p => p.lng);
            bounds = {
              northeast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
              southwest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
            };

            summary = `TomTom Truck Route (${axles} eixos, ${Math.round(weight/1000)}t)`;
            routeWarnings.push(`✓ Rota otimizada para caminhão de ${axles} eixos`);
            
            console.log('TomTom route calculated successfully:', {
              distance: totalDistanceKm,
              duration: totalDurationHours,
            });
          }
        } else {
          const errorText = await tomtomResponse.text();
          console.error('TomTom API error:', tomtomResponse.status, errorText);
          // Fall back to Google
        }
      } catch (tomtomError) {
        console.error('TomTom API failed, falling back to Google:', tomtomError);
      }
    }

    // Fallback to Google Maps if TomTom didn't work or for lighter vehicles
    if (totalDistanceKm === 0 && googleApiKey) {
      console.log('Using Google Maps Directions API');
      
      const origin = allPoints[0].address;
      const destination = allPoints[allPoints.length - 1].address;
      const waypoints = allPoints.slice(1, -1).map(p => p.address);

      // Define road restrictions based on vehicle size (axles)
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

      let directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${googleApiKey}&language=pt-BR&region=br`;
      
      if (waypoints.length > 0) {
        directionsUrl += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
      }

      // For heavy vehicles, request alternatives
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

      if (axles >= 6 && directionsData.routes.length > 1) {
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

      for (const leg of legs) {
        totalDistanceMeters += leg.distance.value;
        totalDurationSeconds += leg.duration.value;
        routeDetails.push({
          from: leg.start_address,
          to: leg.end_address,
          distance: leg.distance.value / 1000,
          duration: leg.duration.value / 60,
        });
      }

      totalDistanceKm = totalDistanceMeters / 1000;
      totalDurationHours = totalDurationSeconds / 3600;
      polyline = route.overview_polyline?.points || null;
      bounds = route.bounds;
      summary = route.summary || '';

      // Update geocoded points from Google response
      geocodedPoints.length = 0;
      if (legs[0]) {
        geocodedPoints.push({
          address: legs[0].start_address,
          lat: legs[0].start_location.lat,
          lng: legs[0].start_location.lng,
        });
      }
      for (const leg of legs) {
        geocodedPoints.push({
          address: leg.end_address,
          lat: leg.end_location.lat,
          lng: leg.end_location.lng,
        });
      }
    }

    // Calculate tolls using TollGuru API if available
    let estimatedTollCost = 0;
    let tollDetails: TollDetail[] = [];
    let tollSource = 'estimated';

    if (tollGuruApiKey && polyline) {
      try {
        console.log('Calling TollGuru API for toll calculation...');
        
        // Map axles to TollGuru vehicle type
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
            const costs = tollGuruData.route.costs;
            estimatedTollCost = costs.tag || costs.cash || costs.licensePlate || 0;
            tollSource = 'tollguru';
            
            console.log('TollGuru toll costs:', costs);
            
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
      bounds,
      summary,
      routingEngine: totalDistanceKm > 0 && summary.includes('TomTom') ? 'tomtom' : 'google',
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
      engine: result.routingEngine,
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
