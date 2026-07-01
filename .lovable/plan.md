## Objetivo
Deixar somente o link de navegação e compartilhamento do Google Maps, removendo todas as referências ao HERE WeGo da interface do resumo da viagem.

## Arquivos envolvidos
- `src/components/frete/screens/DashboardScreen.tsx`
- `src/components/frete/RouteMap.tsx`

## Mudanças

### DashboardScreen.tsx
1. Remover import de `buildHereWeGoUrl` e `buildHereWeGoTruckUrl`.
2. Remover o botão **"Navegar (HERE Caminhão)"** (segundo botão do grid).
3. Remover o botão **"Baixar rota GeoJSON (HERE WeGo)"** — ou ajustar o texto se o GeoJSON ainda for desejado sem menção ao HERE.
4. No compartilhamento WhatsApp, remover a linha do link HERE WeGo, mantendo apenas o Google Maps.

### RouteMap.tsx
1. Remover as funções exportadas `buildHereWeGoUrl` e `buildHereWeGoTruckUrl` se deixarem de ser usadas.
2. Remover função auxiliar `openInHereMaps` se existir e não for mais utilizada.

## Fora do escopo
- Não alterar o motor de roteamento no backend (HERE API continua sendo usada internamente para calcular a rota do caminhão).
- Não alterar o mapa Leaflet nem o tile proxy da HERE.
