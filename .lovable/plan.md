# Migrar para HERE Maps como provedor principal

Substituir Google Maps + TollGuru pela **HERE Routing v8 API**, que já entrega rota, restrições de caminhão, pedágios e mapa estático numa única chamada. Manter TomTom como fallback e remover dependências legadas após validação.

## Pré-requisito

Usuário cria conta gratuita em https://platform.here.com (1.000 transações/dia grátis) e gera uma **API Key REST**. Será solicitada via `add_secret` como `HERE_API_KEY`.

## Arquitetura proposta

```text
Antes:  calculate-route → Google Directions → TomTom (3+ eixos) → TollGuru (pedágios)
        get-route-map   → Google Static Maps

Depois: calculate-route → HERE Routing v8 (rota + restrições + pedágios numa chamada)
                       → TomTom (fallback se HERE falhar)
        get-route-map   → HERE Map Image API v3
```

## Mudanças

### 1. Edge function `calculate-route/index.ts` (refatorar)
- Substituir bloco Google Directions pelo endpoint HERE:
  `https://router.hereapi.com/v8/routes`
- Parâmetros de caminhão nativos: `transportMode=truck`, `vehicle[grossWeight]`, `vehicle[axleCount]`, `vehicle[height/width/length]`, `vehicle[hazardousGoods]`.
- Solicitar `return=polyline,summary,tolls,actions,instructions` e `spans=tollSystems,countryCode`.
- Remover chamada ao TollGuru — pedágio vem em `notices[]` / `tolls[]` da própria HERE com valor em centavos por moeda.
- Remover lista hardcoded de "rodovias proibidas" (Serra do Rio do Rastro etc.) — HERE já aplica restrições oficiais por peso/altura/eixos.
- Manter TomTom como fallback se HERE retornar erro ou cobertura incompleta.
- Resposta mantém o mesmo contrato atual (`totalDistanceKm`, `totalDurationHours`, `estimatedTollCost`, `polyline`, `geocodedPoints`, `bounds`, `routingEngine: 'here' | 'tomtom'`).

### 2. Edge function `get-route-map/index.ts` (refatorar)
- Trocar Google Static Maps por **HERE Map Image API v3**:
  `https://image.maps.hereapi.com/mia/v3/base/mc/overlay`
- Aceita polyline + markers no mesmo formato; retorna PNG.
- Sem restrição de referer no server-side (resolve o 403 atual).

### 3. Frontend
- `useRouteCalculation.tsx`: ajustar tipo `routingEngine` para incluir `'here'`.
- `DashboardScreen.tsx`: exibir "Rota via HERE Maps" no rodapé do mapa.
- Nenhuma mudança em formulários ou fluxo de telas.

### 4. Admin Dashboard (`Admin.tsx`)
- Atualizar cálculo de custos de API:
  - Remover linha "Google Maps" e "TollGuru".
  - Adicionar "HERE Maps" com custo por transação (a definir, ex: US$ 0,80/1k após free tier).
- Mantém Gemini AI e TomTom.

### 5. Secrets
- Adicionar: `HERE_API_KEY` (via `add_secret`).
- Manter: `TOMTOM_API_KEY` (fallback), `GOOGLE_MAPS_API_KEY` (geocoding em formulários, se ainda usado), `LOVABLE_API_KEY` (Gemini).
- Após validação em produção: remover `TOLLGURU_API_KEY` e `GOOGLE_MAPS_API_KEY` se nenhum outro consumidor.

## Plano de validação

1. Implementar as duas edge functions com HERE.
2. Rodar rota-piloto **Criciúma → São Paulo (9 eixos, 49t)** — comparar com último cálculo (888 km, 11,4h, pedágio R$ 0).
3. Validar mais 2 rotas reais (uma com restrição conhecida, uma rota curta urbana).
4. Se distância/tempo/pedágio coerentes: ativar HERE como default e remover código Google+TollGuru.
5. Se cobertura de pedágio falhar em alguma rota: manter TollGuru opcional como segundo provedor só para pedágio.

## Riscos e mitigações

- **Cobertura de pedágio BR**: HERE tem boa cobertura, mas se faltar alguma praça, fallback automático para TollGuru pode ser reintroduzido em 1 dia.
- **Limite gratuito**: 1k req/dia cobre uso atual; monitorar via Admin Dashboard.
- **Quebra de contrato**: edge function mantém o mesmo JSON de saída, sem mudanças no frontend além do label do engine.

## Próximo passo

Aprove o plano e me forneça a `HERE_API_KEY` (vou abrir o formulário seguro de secret após sua aprovação).
