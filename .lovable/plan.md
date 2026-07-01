## Objetivo

Melhorar a apresentação do mapa de roteiro e adicionar compartilhamento para abrir a rota no app do HERE WeGo.

## Mudanças

### 1. `src/components/frete/RouteMap.tsx` — visual + recálculo + compartilhamento

**Traçado em vermelho, mais destacado**
- Polyline principal: cor `#dc2626` (vermelho), `weight: 6`, `opacity: 0.9`.
- Adicionar um "halo" branco por baixo (segunda `Polyline` mesma geometria, `weight: 10`, `color: #fff`, `opacity: 0.9`) para contraste sobre o mapa.
- Linha tracejada cinza (`dashArray: '6 8'`) ligando os pontos em ordem (origem → waypoints → destino) quando ainda não há polyline calculada (feedback visual imediato).

**Recálculo mais fácil**
- Novo botão explícito **"Recalcular rota"** (ícone `RefreshCw`) no cabeçalho do mapa que dispara `onPointsChange` imediatamente, sem esperar o debounce.
- Encurtar o debounce de 800 ms para 500 ms.
- Indicador "recalculando…" já existente permanece.
- Manter os marcadores arrastáveis (origem/destino/waypoints) e o modo `+` para adicionar intermediários.

**Compartilhar para o HERE WeGo**
- Novo botão **"Abrir no HERE Maps"** (ícone `Share2` ou `Navigation`) no cabeçalho.
- Monta URL universal do HERE WeGo:
  `https://wego.here.com/directions/mix/<lat>,<lng>,<label>/<lat>,<lng>,<label>/.../<lat>,<lng>,<label>?map=<centerLat>,<centerLng>,<zoom>,normal`
  - Ordem: origem → waypoints intermediários → destino (usa `livePoints[0]`, `waypoints`, `livePoints[last]`).
  - Labels usam `encodeURIComponent(p.address)`.
- Em mobile tenta primeiro o deep link do app (`here-route://...` / `heremaps://...`) via `window.location.href` com fallback para a URL web após 800 ms; desktop abre direto o link web em nova aba.
- Se o usuário estiver em um dispositivo que tem o HERE WeGo instalado, o SO intercepta o deep link.

### 2. Sem mudanças de backend

O `calculate-route` já aceita `waypoints`; o compartilhamento é puramente client-side. Custos continuam sendo atualizados via `handleRecalculateRoute` em `src/pages/Index.tsx` (já existente).

## Detalhes técnicos

- Ícone do botão recalcular: `RefreshCw` de `lucide-react` (já usado no projeto via outros ícones).
- Ícone do botão compartilhar: `Navigation` de `lucide-react`.
- Helper interno `buildHereWeGoUrl(points: ExportPoint[]): string` no próprio `RouteMap.tsx`.
- Detecção mobile: `/Android|iPhone|iPad/i.test(navigator.userAgent)`.
- Nenhuma dependência nova.

## Fora de escopo

- Alterar cores do tema global.
- Mudar o provedor de tiles (continua HERE via `here-tile-proxy`).
- Alterar lógica de custos / cálculo de rota no backend.
