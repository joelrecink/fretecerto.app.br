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
  waypoints?: RoutePoint[]; // intermediate points user added on the map
  axles: number;
  cargoCapacity?: number; // tons
  vehicleWeight?: number; // kg
  vehicleHeight?: number; // m
  vehicleWidth?: number;  // m
  vehicleLength?: number; // m
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

// ---------- HERE Flexible Polyline decoder (v1) ----------
const HERE_DECODING_TABLE = [
  62, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
  -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
];
function decodeHerePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  let i = 0;
  const decodeChar = () => {
    const c = encoded.charCodeAt(i++) - 45;
    return c >= 0 && c < HERE_DECODING_TABLE.length ? HERE_DECODING_TABLE[c] : -1;
  };
  const decodeUnsigned = () => {
    let result = 0, shift = 0;
    while (i < encoded.length) {
      const v = decodeChar();
      result |= (v & 0x1f) << shift;
      if ((v & 0x20) === 0) return result;
      shift += 5;
    }
    return result;
  };
  const decodeSigned = () => {
    const u = decodeUnsigned();
    return (u & 1) ? ~(u >> 1) : (u >> 1);
  };
  const version = decodeUnsigned();
  if (version !== 1) return [];
  const header = decodeUnsigned();
  const precision = header & 15;
  const thirdDim = (header >> 4) & 7;
  // const thirdDimPrecision = (header >> 7) & 15;
  const factor = Math.pow(10, precision);
  let lat = 0, lng = 0;
  const result: [number, number][] = [];
  while (i < encoded.length) {
    lat += decodeSigned();
    lng += decodeSigned();
    if (thirdDim) decodeSigned();
    result.push([lat / factor, lng / factor]);
  }
  return result;
}

// ---------- Geocoding via HERE ----------
async function hereGeocode(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&in=countryCode:BRA&lang=pt-BR&apiKey=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();
    const pos = data?.items?.[0]?.position;
    if (pos) return { lat: pos.lat, lng: pos.lng };
    console.error('HERE geocode failed:', address, JSON.stringify(data));
    return null;
  } catch (e) {
    console.error('HERE geocode error:', e);
    return null;
  }
}

// ---------- HERE Routing v8 ----------
async function calculateHereRoute(
  points: Array<{ lat: number; lng: number; address: string }>,
  opts: { axles: number; weightKg: number; heightM: number; widthM: number; lengthM: number },
  apiKey: string,
) {
  const origin = `${points[0].lat},${points[0].lng}`;
  const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
  const vias = points.slice(1, -1).map(p => `via=${p.lat},${p.lng}`);

  // Try progressively lighter vehicle profiles until HERE returns a valid route.
  // Heavy trucks (9 axles / 60t+) often fail with "no routes returned" on Brazilian roads.
  const attempts: Array<{ mode: string; label: string; params: Record<string, string> }> = [
    {
      mode: 'truck',
      label: `truck ${opts.axles}ax ${Math.round(opts.weightKg)}kg`,
      params: {
        'vehicle[grossWeight]': String(Math.round(opts.weightKg)),
        'vehicle[height]': String(Math.round(opts.heightM * 100)),
        'vehicle[width]': String(Math.round(opts.widthM * 100)),
        'vehicle[length]': String(Math.round(opts.lengthM * 100)),
        'vehicle[axleCount]': String(opts.axles),
      },
    },
    {
      mode: 'truck',
      label: 'truck standard (40t)',
      params: {
        'vehicle[grossWeight]': '40000',
        'vehicle[height]': '400',
        'vehicle[width]': '255',
        'vehicle[length]': '1815',
        'vehicle[axleCount]': '6',
      },
    },
    { mode: 'truck', label: 'truck no-restrictions', params: {} },
  ];


  let lastErr = '';
  for (const attempt of attempts) {
    const params = new URLSearchParams({
      transportMode: attempt.mode,
      origin,
      destination,
      return: 'polyline,summary,tolls',
      currency: 'BRL',
      lang: 'pt-BR',
      apiKey,
      ...attempt.params,
    });
    let url = `https://router.hereapi.com/v8/routes?${params.toString()}`;
    if (vias.length) url += '&' + vias.join('&');

    const r = await fetch(url);
    if (!r.ok) {
      lastErr = `HERE ${attempt.label}: HTTP ${r.status} ${await r.text()}`;
      console.warn(lastErr);
      continue;
    }
    const data = await r.json();
    if (!data.routes || !data.routes[0] || !data.routes[0].sections?.length) {
      lastErr = `HERE ${attempt.label}: no routes`;
      console.warn(lastErr, JSON.stringify(data).slice(0, 300));
      continue;
    }
    // Validate that at least one section has a decodable polyline
    const sections = data.routes[0].sections;
    let totalCoords = 0;
    let hasAnyPolyline = false;
    for (const s of sections) {
      if (s.polyline) {
        hasAnyPolyline = true;
        totalCoords += decodeHerePolyline(s.polyline).length;
      }
    }
    if (!hasAnyPolyline || totalCoords < 2) {
      lastErr = `HERE ${attempt.label}: route returned without decodable polyline (hasPolyline=${hasAnyPolyline}, coords=${totalCoords})`;
      console.warn(lastErr);
      continue;
    }
    console.log(`HERE routed with ${attempt.label} (${totalCoords} coords)`);
    return { route: data.routes[0], profile: attempt.label };
  }
  throw new Error(`HERE Routing failed after all fallbacks. Last: ${lastErr}`);
}



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const hereApiKey = Deno.env.get('HERE_API_KEY');
    const tomtomApiKey = Deno.env.get('TOMTOM_API_KEY');
    if (!hereApiKey && !tomtomApiKey) {
      throw new Error('No routing provider configured (HERE or TomTom)');
    }

    const {
      origins, destinations, waypoints, axles,
      cargoCapacity, vehicleWeight, vehicleHeight, vehicleWidth, vehicleLength,
    } = await req.json() as RouteRequest;

    console.log('Calculating route', { user: user.id, axles, cargoCapacity, waypoints: waypoints?.length ?? 0 });

    const allPoints = [...origins, ...(waypoints ?? []), ...destinations];
    if (allPoints.length < 2) throw new Error('At least 2 points required');

    // ---- Vehicle defaults ----
    const weightKg = vehicleWeight || (7500 + Math.max(0, axles - 2) * 8000);
    const heightM = vehicleHeight || 4.0;
    const widthM = vehicleWidth || 2.55;
    const lengthM = vehicleLength || (axles <= 4 ? 14 : axles <= 6 ? 18.15 : 19.8);

    // ---- Geocode via HERE ----
    if (!hereApiKey) throw new Error('HERE_API_KEY not configured');
    const geocodedPoints: Array<{ address: string; lat: number; lng: number }> = [];
    for (const p of allPoints) {
      if (p.lat && p.lng) {
        geocodedPoints.push({ address: p.address, lat: p.lat, lng: p.lng });
      } else {
        const c = await hereGeocode(p.address, hereApiKey);
        if (!c) {
          return new Response(JSON.stringify({
            success: false,
            error: `Endereço não encontrado: "${p.address}". Verifique se está escrito corretamente (ex: "Rua, número, cidade, UF").`,
            invalidAddress: p.address,
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        geocodedPoints.push({ address: p.address, ...c });
      }
    }

    let totalDistanceKm = 0;
    let totalDurationHours = 0;
    let polyline: string | null = null;
    let routeDetails: Array<{ from: string; to: string; distance: number; duration: number }> = [];
    let estimatedTollCost = 0;
    let tollDetails: TollDetail[] = [];
    let tollSource: 'here' | 'unavailable' = 'unavailable';
    let routingEngine: 'here' | 'tomtom' = 'here';
    let routeWarnings: string[] = [];
    let summary = '';

    // ---- HERE Routing ----
    try {
      const { route, profile: hereProfile } = await calculateHereRoute(
        geocodedPoints,
        { axles, weightKg, heightM, widthM, lengthM },
        hereApiKey,
      );


      let totalMeters = 0;
      let totalSeconds = 0;
      const polylineSegments: string[] = [];
      const routeCoordinates: [number, number][] = [];
      let tollIdCounter = 1;

      for (let i = 0; i < route.sections.length; i++) {
        const section = route.sections[i];
        const secMeters = section.summary?.length ?? 0;
        const secSeconds = section.summary?.duration ?? 0;
        totalMeters += secMeters;
        totalSeconds += secSeconds;

        routeDetails.push({
          from: geocodedPoints[i]?.address || `Ponto ${i + 1}`,
          to: geocodedPoints[i + 1]?.address || `Ponto ${i + 2}`,
          distance: secMeters / 1000,
          duration: secSeconds / 60,
        });

        if (section.polyline) {
          polylineSegments.push(section.polyline);
          const decoded = decodeHerePolyline(section.polyline);
          // Avoid duplicating join points between sections
          for (let k = 0; k < decoded.length; k++) {
            if (k === 0 && routeCoordinates.length > 0) {
              const last = routeCoordinates[routeCoordinates.length - 1];
              if (last[0] === decoded[k][0] && last[1] === decoded[k][1]) continue;
            }
            routeCoordinates.push(decoded[k]);
          }
        }

        // Tolls: section.tolls is an array of toll structures with `fares` (price + currency)
        if (Array.isArray(section.tolls)) {
          for (const t of section.tolls) {
            const fares = Array.isArray(t.fares) ? t.fares : [];
            let price = 0;
            let currency = 'BRL';
            for (const f of fares) {
              const p = typeof f.price?.value === 'number' ? f.price.value : 0;
              if (p > 0 && (price === 0 || p < price)) {
                price = p;
                currency = f.price?.currency || currency;
              }
            }
            if (price > 0) {
              estimatedTollCost += price;
              tollDetails.push({
                id: tollIdCounter++,
                name: t.name || t.tollSystem?.name || 'Pedágio',
                road: t.tollSystem?.name || '',
                state: t.countryCode || '',
                tagCost: price,
                cashCost: price,
                currency,
              });
              tollSource = 'here';
            }
          }
        }
      }

      if (routeCoordinates.length < 2) {
        throw new Error('HERE retornou distância, mas não retornou o traçado navegável da estrada.');
      }

      totalDistanceKm = totalMeters / 1000;
      totalDurationHours = totalSeconds / 3600;
      polyline = polylineSegments.join(';');

      const lats = routeCoordinates.map(p => p[0]);
      const lngs = routeCoordinates.map(p => p[1]);
      const bounds = {
        northeast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
        southwest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
      };

      summary = `HERE Routing — perfil: ${hereProfile}`;
      routeWarnings.push(
        hereProfile.startsWith('truck ' + axles)
          ? `✓ Rota oficial para caminhão de ${axles} eixos (restrições legais aplicadas pela HERE)`
          : `⚠️ HERE não encontrou rota para o perfil exato (${axles} eixos). Traçado gerado com perfil: ${hereProfile}.`
      );


      const result = {
        success: true,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        totalDurationHours: Math.round(totalDurationHours * 10) / 10,
        estimatedTollCost: Math.round(estimatedTollCost * 100) / 100,
        tollSource,
        tollDetails,
        routeDetails,
        polyline,
        routeCoordinates,
        geocodedPoints,
        bounds,
        summary,
        routingEngine,
        vehicleRestrictions: {
          axles,
          warnings: routeWarnings,
          avoidedRoads: [] as string[],
        },
      };

      console.log('HERE route OK:', {
        km: result.totalDistanceKm, h: result.totalDurationHours,
        toll: result.estimatedTollCost, tolls: tollDetails.length,
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (hereErr) {
      const msg = hereErr instanceof Error ? hereErr.message : String(hereErr);
      console.error('HERE routing failed:', msg);
      return new Response(JSON.stringify({
        success: false,
        error: `Não foi possível calcular uma rota navegável para este veículo (${axles} eixos, ~${Math.round(weightKg / 1000)}t) entre os pontos informados. Tente revisar os endereços ou reduzir as restrições do veículo.`,
        detail: msg,
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('calculate-route error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
