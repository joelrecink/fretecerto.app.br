## Objetivo

Adicionar duas finalizações com exportação e permitir edição visual do traçado no mapa que recalcule custos.

## 1. Exportação no Resumo da Viagem (pré-cálculo)

Na tela `TripSummaryScreen.tsx`, adicionar botão **"Imprimir Resumo"** que gera um PDF/impressão com:
- Dados do veículo (placa, eixos, motorista, consumo, preço combustível)
- Todos os pontos de coleta e entrega (endereços + valores + pesos)
- Frete total estimado
- Distância prevista
- Configuração de retorno vazio (se ativo, distância e custo estimado)

Implementação: usar `window.print()` com uma view dedicada (`@media print` CSS) ou gerar via `jsPDF` + `html2canvas` para download direto.

## 2. Exportação da Análise IA (pós-cálculo)

No `DashboardScreen.tsx` (resultado final com IA), adicionar botão **"Exportar Roteiro para Motorista"** com opções:
- **PDF completo**: resumo executivo — dados da viagem, custos detalhados, análise IA (score, margem, alertas, sugestões), mapa da rota (imagem), coordenadas dos pontos, distância/duração, pedágios
- **Compartilhar por WhatsApp** (já existe — manter)
- **Exportar rota GPX/KML** (já existe no RouteMap — expor também aqui)

O PDF é o entregável para o motorista: rota, endereços, valores, alertas de restrições do veículo.

## 3. Edição visual do traçado no mapa (waypoints)

Estender `RouteMap.tsx` para permitir **adicionar/mover waypoints intermediários** que alteram o traçado:
- Clique no mapa → adiciona um waypoint intermediário (marcador roxo arrastável)
- Arrastar waypoint → recalcula rota via HERE passando por ele
- Botão "Remover waypoint" no popup
- Ao alterar traçado → `calculate-route` retorna nova distância/duração/pedágio → custos da viagem se atualizam automaticamente (mesmo mecanismo do `handleRecalculateRoute` já existente)

Backend: `calculate-route` já aceita origins/destinations; adicionar suporte a `via` (waypoints intermediários) que a HERE Routing v8 suporta via parâmetro `via=lat,lng`.

## Arquivos afetados

- `src/components/frete/screens/TripSummaryScreen.tsx` — botão imprimir + view de impressão
- `src/components/frete/screens/DashboardScreen.tsx` — botão exportar PDF para motorista
- `src/lib/tripExport.ts` (novo) — geração de PDF (jsPDF)
- `src/components/frete/RouteMap.tsx` — adicionar/remover waypoints por clique
- `src/pages/Index.tsx` — propagar waypoints no recálculo
- `src/hooks/useRouteCalculation.tsx` — aceitar `waypoints`
- `supabase/functions/calculate-route/index.ts` — repassar `via=` para HERE

## Dependências novas

`jspdf` (~50KB) para geração de PDF client-side. Sem servidor extra.

## Perguntas de decisão

Antes de implementar, confirme:
1. **Formato do resumo pré-cálculo**: PDF para download, ou apenas impressão via browser (Ctrl+P)?
2. **PDF do motorista**: incluir imagem do mapa embutida no PDF? (aumenta ~200KB por PDF mas é útil para o motorista)
3. **Waypoints no mapa**: máximo de quantos pontos intermediários permitir? (sugiro 5 para não estourar limite de URL da HERE)
