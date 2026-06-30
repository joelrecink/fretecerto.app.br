import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('HERE_API_KEY');
    if (!apiKey) {
      return new Response('HERE_API_KEY not configured', { status: 500, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const z = url.searchParams.get('z');
    const x = url.searchParams.get('x');
    const y = url.searchParams.get('y');
    const style = url.searchParams.get('style') || 'explore.day';
    const size = url.searchParams.get('size') || '256';

    if (!z || !x || !y) {
      return new Response('Missing z/x/y', { status: 400, headers: corsHeaders });
    }

    const tileUrl = `https://maps.hereapi.com/v3/base/mc/${z}/${x}/${y}/png?style=${style}&size=${size}&apiKey=${apiKey}`;
    const r = await fetch(tileUrl);
    if (!r.ok) {
      const text = await r.text();
      console.error('HERE tile error:', r.status, text.slice(0, 200));
      return new Response(`Tile error ${r.status}`, { status: r.status, headers: corsHeaders });
    }

    const buf = await r.arrayBuffer();
    return new Response(buf, {
      headers: {
        ...corsHeaders,
        'Content-Type': r.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('here-tile-proxy error:', msg);
    return new Response(msg, { status: 500, headers: corsHeaders });
  }
});
