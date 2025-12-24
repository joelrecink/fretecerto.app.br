import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MapRequest {
  polyline: string;
  geocodedPoints: Array<{
    address: string;
    lat: number;
    lng: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { polyline, geocodedPoints } = await req.json() as MapRequest;

    if (!geocodedPoints || geocodedPoints.length < 2) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient points' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build markers
    const markers = geocodedPoints.map((point, index) => {
      const label = index === 0 ? 'A' : index === geocodedPoints.length - 1 ? 'B' : '';
      const color = index === 0 ? 'green' : index === geocodedPoints.length - 1 ? 'red' : 'blue';
      return `markers=color:${color}|label:${label}|${point.lat},${point.lng}`;
    }).join('&');

    // Build path from polyline
    const pathParam = polyline 
      ? `path=enc:${encodeURIComponent(polyline)}|color:0x4285F4ff|weight:4`
      : '';

    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&${markers}&${pathParam}&key=${googleApiKey}`;

    // Fetch the image
    const mapResponse = await fetch(mapUrl);
    
    if (!mapResponse.ok) {
      console.error('Google Maps API error:', mapResponse.status);
      return new Response(JSON.stringify({ success: false, error: 'Failed to generate map' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const imageBuffer = await mapResponse.arrayBuffer();
    
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-route-map:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
