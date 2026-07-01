## Problema

O link do Google Maps abre bem no app, mas o Maps recalcula a rota como **carro** e pode sugerir atalhos proibidos para caminhão (ruas estreitas, pontes baixas, serras com restrição de eixos). O HERE WeGo respeita o perfil de caminhão, mas o link universal `wego.here.com` cai na tela "Baixe o app" mesmo com o app instalado.

## Solução: forçar o Google Maps a seguir o traçado do caminhão via waypoints

Em vez de mandar só origem → destino, injetamos **pontos intermediários amostrados do polyline navegável já calculado pela HERE para o perfil do caminhão**. Com waypoints ao longo do trajeto, o Google Maps é obrigado a passar por eles e não consegue "atalhar" por rua proibida. O usuário abre no app nativo que já tem instalado, com a rota do caminhão preservada.

Complementarmente, oferecemos um **segundo botão** para quem prefere navegar no HERE WeGo (rota-caminhão nativa) usando deep link `here-route://` que abre direto no app instalado, com fallback web.

### Ajustes

1. **`src/lib/routeExport.ts`** (ou onde vive `buildHereWeGoUrl`)
   - Nova função `buildGoogleMapsUrlWithWaypoints(coords, maxWaypoints=8)`:
     - Recebe `routeCoordinates` (polyline decodificado do caminhão).
     - Amostra ~8 pontos igualmente espaçados ao longo do array (Google Maps limita ~9 waypoints no link universal).
     - Monta `https://www.google.com/maps/dir/?api=1&origin=lat,lng&destination=lat,lng&waypoints=lat,lng|lat,lng|...&travelmode=driving`.
   - Nova função `buildHereWeGoDeepLink(origin, destination, waypoints)`:
     - Usa esquema `here-route://<lat>,<lng>/<lat>,<lng>?m=t` (truck mode) com fallback web.

2. **`src/components/frete/screens/DashboardScreen.tsx`**
   - Passar `routeCoordinates` do resultado da rota para `buildGoogleMapsUrlWithWaypoints`.
   - Substituir o link atual do Google Maps por essa versão com waypoints.
   - Adicionar segundo botão "Abrir no HERE WeGo (caminhão)" ao lado, usando o deep link.
   - Atualizar a mensagem do WhatsApp para incluir os dois links (Google Maps com waypoints + HERE WeGo caminhão), deixando o motorista escolher.

3. **`src/components/frete/RouteMap.tsx`** (se ainda tem botão de compartilhar lá)
   - Mesma troca para consistência.

### Detalhes técnicos

- **Por que 8 waypoints**: o link `dir/?api=1` do Google aceita até 9 waypoints; usar todos os ~500 pontos do polyline explodiria a URL.
- **Amostragem**: pegar índices `Math.floor(i * (coords.length-1) / (n+1))` para `i=1..n`, evitando duplicar origem/destino.
- **Custo**: zero — usa dados já retornados por `calculate-route`, nenhuma chamada extra à API.
- **Limitação honesta**: se o Google decidir que um waypoint específico não é acessível por rua asfaltada, pode ainda desviar entre waypoints. Mitigamos escolhendo waypoints em cidades/entroncamentos principais do trajeto (usar os pontos mais próximos de `section.summary` da HERE, se disponíveis).
