## Mapa interativo com edição de coordenadas e exportação

Substituir o PNG estático por um mapa interativo Leaflet com traçado completo da rota, permitir ao usuário **arrastar marcadores** (ou editar lat/lng) para corrigir pontos, **recalcular automaticamente** distância/pedágio/custos, e **exportar** mapa+coordenadas (PNG + GPX/KML/JSON).

### Backend

**`supabase/functions/calculate-route/index.ts`**
- Decodificar a flexible polyline da HERE no edge function (porta TS do algoritmo público, ~40 linhas, sem deps).
- Retornar novo campo `routeCoordinates: [lat, lng][]` (todas as seções concatenadas) além do `polyline` atual.
- Aceitar pontos já com `lat`/`lng` (skip do geocoding) — já suportado; garantir que recálculos disparados por arraste reusem coordenadas em vez de re-geocodificar.
- Fallback TomTom: converter `route.legs[].points` no mesmo formato `[lat, lng][]`.

**Novo: `supabase/functions/here-tile-proxy/index.ts`**
- Proxy `{z}/{x}/{y}` → `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?apiKey=...&style=explore.day&size=512`.
- Mantém `HERE_API_KEY` server-side. `Cache-Control: public, max-age=86400`.
- `verify_jwt = false` (tiles são públicos por natureza, key fica protegida).

**`get-route-map/index.ts`**: mantido como fallback de exportação server-side (PNG bbox+markers).

### Frontend

**Instalar:** `bun add leaflet react-leaflet @types/leaflet leaflet-image`
(`leaflet-image` gera PNG client-side para exportação que respeita o estado atual do mapa.)

**Novo: `src/components/frete/RouteMap.tsx`**
- `<MapContainer>` (react-leaflet) com:
  - `TileLayer` → edge function `here-tile-proxy`.
  - `Polyline` com `routeCoordinates`.
  - `Marker`s **draggable**: verde (origens), azul (intermediários), vermelho (destinos). Popup mostra endereço + lat/lng editáveis (inputs numéricos).
  - `fitBounds` automático no carregamento.
- Props: `coordinates`, `points`, `onPointChange(index, lat, lng)`.
- Debounce de 800ms ao arrastar/editar antes de disparar `onPointChange` (evita recálculos em rajada).
- Toolbar do mapa:
  - **Exportar PNG** (leaflet-image do estado atual).
  - **Exportar GPX** / **KML** / **JSON** (gerados client-side a partir de `routeCoordinates` + `points`).
  - **Resetar coordenadas** (volta para as geocodificadas originais).

**Novo: `src/lib/routeExport.ts`**
- `toGPX(coords, points)`, `toKML(...)`, `toJSON(...)` → strings.
- `download(filename, mime, content)` helper (Blob + `<a download>`).

**`src/types.ts`**
- `SimulationResult` (ou tipo de rota): adicionar `routeCoordinates?: [number, number][]`.
- `GeocodedPoint`: já tem `address/lat/lng`; adicionar `editedByUser?: boolean` para indicar override manual.

**`src/hooks/useRouteCalculation.tsx`**
- Propagar `routeCoordinates`.
- Nova função `recalculateWithEditedPoints(points)`: aceita pontos com lat/lng já definidos, envia direto ao edge function (sem re-geocodificar), retorna novo resultado.

**`src/components/frete/screens/DashboardScreen.tsx`** (ou `Dashboard.tsx`)
- Substituir `<img src=".../get-route-map">` por `<RouteMap ... />`.
- Handler `onPointChange` chama `recalculateWithEditedPoints` → atualiza `result` global.
- Loading spinner sobre o mapa durante recálculo.
- Após recálculo, **`handleCalculate` do `Index.tsx` (ou hook de custos) reexecuta** com nova `totalDistanceKm`, `totalDurationHours`, `estimatedTollCost` — isso refaz combustível, comissão, manutenção, custos fixos proporcionais, ARDA, retorno vazio etc., e o Dashboard re-renderiza com os novos valores.

**`src/main.tsx`**
- `import 'leaflet/dist/leaflet.css'`.

### Fluxo do usuário (arrastar marcador)

```text
1. usuário arrasta marcador no mapa
2. RouteMap dispara onPointChange (debounced 800ms)
3. DashboardScreen chama recalculateWithEditedPoints(points atualizados)
4. edge function HERE recalcula rota (pula geocoding, usa lat/lng diretos)
5. retorna novo routeCoordinates + distância + pedágio
6. handleCalculate refaz todos os custos com nova distância
7. mapa e cards de custo atualizam juntos
```

### Detalhes técnicos

- Decoder HERE flexible polyline: implementação inline em ambos edge function e — se preciso no client — em `src/lib/herePolyline.ts`.
- Tile proxy: rota Supabase functions não suporta path params nativamente; usar query `?z=&x=&y=` na URL do `TileLayer` (`https://...functions/v1/here-tile-proxy?z={z}&x={x}&y={y}`).
- Exportação PNG via `leaflet-image` precisa de `crossOrigin` nos tiles → proxy já devolve mesma origem.
- Custo API: cada arraste = 1 chamada HERE Routing (~US$ 0,0008). Debounce de 800ms + botão "Aplicar alterações" alternativo para usuários que queiram editar vários pontos antes de recalcular.
- Recálculo NÃO consome créditos do usuário (créditos só na análise de IA, já existente).

### Fora de escopo

- Não alterar lógica de IA, créditos, ou outras telas do fluxo de 7 passos.
- Não remover `get-route-map` (fica como fallback de exportação server-side).
- Edição de coordenadas não persiste no `trip_history` automaticamente — usuário ainda precisa clicar em "Salvar viagem".
