import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MapRequest {
  polyline: string; // HERE flexible polyline (may be ; -separated segments)
  geocodedPoints: Array<{ address: string; lat: number; lng: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hereApiKey = Deno.env.get('HERE_API_KEY');
    if (!hereApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'HERE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { polyline, geocodedPoints } = await req.json() as MapRequest;
    if (!geocodedPoints || geocodedPoints.length < 2) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient points' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // HERE Map Image API v3 — overlay endpoint accepts polyline + markers
    // Docs: https://developer.here.com/documentation/map-image/dev_guide/topics_v3/overlay.html
    const url = new URL('https://image.maps.hereapi.com/mia/v3/base/mc/overlay');
    url.searchParams.set('apiKey', hereApiKey);
    url.searchParams.set('w', '600');
    url.searchParams.set('h', '300');
    url.searchParams.set('style', 'explore.day');

    // Polyline (HERE flexible polyline) — handle concatenated sections
    if (polyline) {
      const segments = polyline.split(';').filter(Boolean);
      for (const seg of segments) {
        url.searchParams.append('polyline', `${seg};fc=2563eb;sc=ffffff;lw=5`);
      }
    }

    // Markers: green start, red end, blue intermediates
    geocodedPoints.forEach((p, i) => {
      const color = i === 0 ? '00aa00' : i === geocodedPoints.length - 1 ? 'd22d2d' : '2563eb';
      url.searchParams.append('marker', `${p.lat},${p.lng};fc=${color};sc=ffffff`);
    });

    const r = await fetch(url.toString());
    if (!r.ok) {
      const text = await r.text();
      console.error('HERE Map Image error:', r.status, text);
      return new Response(JSON.stringify({ success: false, error: `HERE map error ${r.status}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const buf = await r.arrayBuffer();
    return new Response(buf, {
      headers: {
        ...corsHeaders,
        'Content-Type': r.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('get-route-map error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
