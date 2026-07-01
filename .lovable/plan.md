## Objetivo

Trocar/complementar o compartilhamento por **link** do HERE WeGo por um **arquivo GeoJSON** anexável (WhatsApp, e-mail, etc.). Ao abrir o arquivo no celular com o HERE WeGo instalado, ele importa o traçado e as paradas direto, sem cair na tela "Baixe o app".

## O que muda

### 1. `src/lib/routeExport.ts` — nova função `toGeoJSON`
Gera um `FeatureCollection` com:
- **LineString** do traçado navegável (`routeCoordinates` decodificado da HERE, já em modo caminhão) — coordenadas em `[lng, lat]` como manda o padrão GeoJSON.
- **Features Point** para Origem, Paradas e Destino, com `properties.name` e `properties.type` (`origin` / `waypoint` / `destination`).
- `properties` no nível da rota: distância total (km), duração (h), perfil de veículo (eixos) e data de geração.

### 2. `src/components/frete/screens/DashboardScreen.tsx`
Substituir o botão atual **"Baixar rota em GPX"** por **"Baixar rota GeoJSON (HERE WeGo)"**:
- Monta os pontos (origem + paradas fixas + waypoints do motorista + destino).
- Usa `result.routeCoordinates` (traçado real do caminhão calculado pela HERE); se estiver vazio, cai para linha reta entre pontos.
- Chama `toGeoJSON(...)` e usa `download()` com MIME `application/geo+json` e nome `rota-fretecerto-YYYY-MM-DD-HHmm.geojson`.
- Toast explicando: "Abra o arquivo no celular — o HERE WeGo importa o traçado direto."

Manter os botões existentes (Google Maps travado por waypoints, HERE WeGo Truck via link, Compartilhar WhatsApp com links) — o GeoJSON é um **caminho adicional** para quem prefere abrir o arquivo em vez do link.

### 3. Opcional na mensagem do WhatsApp
Adicionar uma linha explicativa: *"Prefere abrir no app? Baixe o GeoJSON no botão acima e abra com o HERE WeGo."* — sem anexar o arquivo automaticamente (WhatsApp Web via `wa.me` não aceita anexos programáticos; o motorista baixa e anexa manualmente, ou o usuário pode compartilhar via *share sheet* nativo em outro passo).

## Fora do escopo

- Web Share API nível 2 (`navigator.share` com `files`) — pode ser adicionada depois se você quiser um botão "Compartilhar arquivo" que aciona o menu nativo do celular (WhatsApp, e-mail, Drive) já com o `.geojson` anexado. Diga se quer incluir agora.
- Alterações no edge function `calculate-route` — o dado já está pronto no `routeCoordinates`.

## Observação técnica honesta

O HERE WeGo importa GeoJSON como **coleção/rota visualizável**, não substitui o cálculo de navegação turn-by-turn do próprio app — mas mostra o traçado exato calculado para o caminhão e as paradas, sem depender de link universal nem cair em interstitial de download.
