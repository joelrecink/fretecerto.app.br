
## Diagnóstico

Nos logs:
1. HERE responde com sucesso no perfil `truck 9ax 63500kg` (distância/summary OK).
2. Mas `routeCoordinates.length < 2` → dispara `throw "HERE retornou distância, mas não retornou o traçado navegável da estrada."`
3. Cai no fallback TomTom → **401 Unauthorized** (chave `TOMTOM_API_KEY` inválida/expirada) → retorna 500 ao cliente.

Ou seja, o HERE aceitou o request mas não devolveu polyline decodificável naquela primeira tentativa, e como o try/catch está **fora** do loop de perfis, os perfis mais leves (40t, sem restrições, car) nunca são tentados.

## Correções em `supabase/functions/calculate-route/index.ts`

### 1. Mover validação da polyline para dentro do loop de perfis HERE
Em `calculateHereRoute`, após montar `routeCoordinates` (mover parte do parsing para dentro do loop), se a polyline decodificada tiver < 2 pontos, registrar `lastErr` e **continuar para o próximo perfil** em vez de retornar aquele route. Assim, se o perfil "9 eixos" volta sem polyline, ele automaticamente tenta 40t, depois sem restrições, depois car.

Alternativa mais simples e menos invasiva: manter a estrutura atual mas, no handler, ao capturar o erro "não retornou o traçado navegável", **re-chamar `calculateHereRoute` pulando o primeiro perfil**. Vamos pela solução limpa: incluir a decodificação dentro do loop já no `calculateHereRoute` e validar coords antes de aceitar.

### 2. Remover fallback TomTom (chave inválida)
A `TOMTOM_API_KEY` está retornando 401. Em vez de tentar TomTom e vazar erro 500, retornar uma mensagem clara ao usuário:

> "Não foi possível calcular a rota navegável para este veículo (X eixos, Y toneladas) entre os pontos informados. Tente reduzir os eixos/peso ou revisar os endereços."

Isso deixa a UI mostrar erro amigável em vez de tela branca.

### 3. Melhorar log de debug
Logar `route.sections[0].polyline?.length` quando decodificação falha, para diagnóstico futuro.

## Arquivos alterados
- `supabase/functions/calculate-route/index.ts` (refatorar `calculateHereRoute` + remover bloco TomTom)

Nenhuma alteração de frontend. Deploy automático do edge function.
