
## Diagnóstico

Log mostra: `hasPolyline=true, coords=0` em **todos** os perfis HERE. Ou seja, a API HERE está retornando strings de polyline válidas, mas nosso `decodeHerePolyline` está devolvendo array vazio. Bug no decoder de flexible polyline (provavelmente na leitura do header — versão/precision/thirdDim) que estava funcionando por acaso antes ou o formato mudou.

## Correção

Substituir a implementação de `decodeHerePolyline` em `supabase/functions/calculate-route/index.ts` pela **decodificadora de referência oficial da HERE** (github.com/heremaps/flexible-polyline). Ela lida corretamente com:
- Version (bits variáveis unsigned)
- Header packing: `precision (4 bits) | thirdDim (3 bits) | thirdDimPrec (4 bits)`
- ThirdDim consume (elevation, level, altitude, custom) — descarta valor mas continua parsing
- Loop bem definido usando `i < encoded.length`

Nada muda no restante do fluxo. Após decoder correto, o primeiro perfil (truck 9ax) já deve produzir traçado válido e responder 200.

## Arquivos
- `supabase/functions/calculate-route/index.ts` — substituir apenas `HERE_DECODING_TABLE` + função `decodeHerePolyline`.
