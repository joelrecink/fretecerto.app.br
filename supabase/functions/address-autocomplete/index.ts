import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = /^[\p{L}\p{N}\s,.\-/º°#()]+$/u;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    let q = (url.searchParams.get('q') || '').trim();
    let lat = url.searchParams.get('lat');
    let lng = url.searchParams.get('lng');
    if (!q && (req.method === 'POST' || req.method === 'PUT')) {
      try {
        const body = await req.json();
        q = String(body?.q || '').trim();
        lat = body?.lat != null ? String(body.lat) : lat;
        lng = body?.lng != null ? String(body.lng) : lng;
      } catch { /* ignore */ }
    }

    if (q.length < 3 || q.length > 200 || !ALLOWED.test(q)) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('HERE_API_KEY');
    if (!apiKey) throw new Error('HERE_API_KEY not configured');

    // HERE Autosuggest requires either `at` or `in` bounding. Use Brazil centroid as default `at`.
    const at = (lat && lng) ? `${lat},${lng}` : '-14.235,-51.925';
    const hereUrl = `https://autosuggest.search.hereapi.com/v1/autosuggest?q=${encodeURIComponent(q)}&at=${at}&in=countryCode:BRA&lang=pt-BR&limit=6&apiKey=${apiKey}`;

    const r = await fetch(hereUrl);
    if (!r.ok) {
      const txt = await r.text();
      console.error('HERE autosuggest error', r.status, txt);
      return new Response(JSON.stringify({ suggestions: [], error: `HERE ${r.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const data = await r.json();
    const items = Array.isArray(data.items) ? data.items : [];
    const suggestions = items
      .filter((it: any) => it.position && it.address)
      .map((it: any) => ({
        id: it.id || `${it.position.lat},${it.position.lng}`,
        label: it.address?.label || it.title,
        title: it.title,
        lat: it.position.lat,
        lng: it.position.lng,
      }));

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('address-autocomplete error:', msg);
    return new Response(JSON.stringify({ error: msg, suggestions: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
