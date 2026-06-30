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

    // HERE Map Image API v3
    // Docs: https://www.here.com/docs/bundle/map-image-api-developer-guide-v3/page/topics/overview.html
    // Format: https://image.maps.hereapi.com/mia/v3/base/mc/{bbox|center}/{w}x{h}/{fmt}
    const lats = geocodedPoints.map(p => p.lat);
    const lngs = geocodedPoints.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const padLat = Math.max((maxLat - minLat) * 0.15, 0.05);
    const padLng = Math.max((maxLng - minLng) * 0.15, 0.05);
    const bbox = `bbox:${minLng - padLng},${minLat - padLat},${maxLng + padLng},${maxLat + padLat}`;

    const url = new URL(`https://image.maps.hereapi.com/mia/v3/base/mc/${bbox}/600x300/png`);
    url.searchParams.set('apiKey', hereApiKey);
    url.searchParams.set('style', 'explore.day');

    // Route polylines — only include if total URL stays under ~6000 chars
    if (polyline) {
      const segments = polyline.split(';').filter(Boolean);
      const totalLen = segments.reduce((a, s) => a + s.length, 0);
      if (totalLen < 5500) {
        segments.forEach((seg, idx) => {
          url.searchParams.append(`route${idx}`, `${seg};sc=2563eb;sd=ffffff;sw=5`);
        });
      } else {
        console.warn(`Polyline too long (${totalLen} chars), rendering markers only`);
      }
    }

    // POIs: green start, red end, blue intermediates
    geocodedPoints.forEach((p, i) => {
      const color = i === 0 ? '00aa00' : i === geocodedPoints.length - 1 ? 'd22d2d' : '2563eb';
      url.searchParams.append(`pois${i}`, `${p.lat},${p.lng};fc=${color};sc=ffffff`);
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
