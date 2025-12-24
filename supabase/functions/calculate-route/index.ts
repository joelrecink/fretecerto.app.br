import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

interface TollInfo {
  name: string;
  price: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      throw new Error('Google Maps API key not configured');
    }

    const { origins, destinations, axles } = await req.json() as RouteRequest;
    
    console.log('Calculating route for:', { origins, destinations, axles });

    // Build all waypoints in order: origins -> destinations
    const allPoints = [...origins, ...destinations];
    
    if (allPoints.length < 2) {
      throw new Error('At least 2 points required for route calculation');
    }

    // Create waypoints string for the route
    const origin = allPoints[0].address;
    const destination = allPoints[allPoints.length - 1].address;
    const waypoints = allPoints.slice(1, -1).map(p => p.address);

    // Call Google Directions API
    let directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}&language=pt-BR&region=br`;
    
    if (waypoints.length > 0) {
      directionsUrl += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
    }

    console.log('Calling Google Directions API...');
    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();

    if (directionsData.status !== 'OK') {
      console.error('Directions API error:', directionsData.status, directionsData.error_message);
      throw new Error(`Google Directions API error: ${directionsData.status} - ${directionsData.error_message || 'Unknown error'}`);
    }

    const route = directionsData.routes[0];
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

    // Estimate tolls based on Brazilian highway toll data
    // Average toll cost per km varies by road type and axles
    // Using estimates: 2-axle: R$0.15/km, 3-axle: R$0.22/km, 4-axle: R$0.30/km, 5-axle: R$0.38/km, 6+: R$0.45/km
    const tollRatePerKm: Record<number, number> = {
      2: 0.15,
      3: 0.22,
      4: 0.30,
      5: 0.38,
      6: 0.45,
      7: 0.52,
      9: 0.65,
    };
    
    const axleRate = tollRatePerKm[axles] || tollRatePerKm[6];
    
    // Estimate that ~60% of Brazilian interstate routes have tolls
    const tollableDistance = totalDistanceKm * 0.6;
    const estimatedTollCost = tollableDistance * axleRate;

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

    const result = {
      success: true,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationHours: Math.round(totalDurationHours * 10) / 10,
      estimatedTollCost: Math.round(estimatedTollCost * 100) / 100,
      routeDetails,
      polyline,
      geocodedPoints,
      bounds: route.bounds,
      summary: route.summary,
    };

    console.log('Route calculation successful:', {
      distance: result.totalDistanceKm,
      duration: result.totalDurationHours,
      tolls: result.estimatedTollCost,
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
