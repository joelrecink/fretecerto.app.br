## Diagnóstico

Código já está aplicado no repositório:
- `TripSummaryScreen.tsx` linha 140-146 — botão **Imprimir Resumo (PDF)**
- `DashboardScreen.tsx` linha 615-622 — botão **Exportar Roteiro para Motorista (PDF)** + atalho na barra inferior (linha 636)
- `RouteMap.tsx` — botão **+** (roxo) no cabeçalho para adicionar waypoints
- `calculate-route/index.ts` — parâmetro `waypoints` já propagado para HERE
- `jspdf` instalado, typecheck passa sem erros

O código está correto, então o problema é **preview desatualizado** (bundle em cache do navegador ou dev server servindo versão anterior).

## Plano de validação

1. **Reiniciar o dev server** para forçar rebuild limpo do Vite.
2. **Verificar via Playwright headless**:
   - Abrir `http://localhost:8080`, autenticar com sessão injetada
   - Percorrer o fluxo até `TripSummaryScreen` e capturar screenshot confirmando o botão "Imprimir Resumo (PDF)"
   - Ir até `DashboardScreen` (calcular rota), capturar screenshot do botão "Exportar Roteiro para Motorista (PDF)" e da barra do mapa com o botão `+`
3. **Se os botões estiverem presentes no screenshot**: instruir você a fazer *hard refresh* no preview (Ctrl+Shift+R / recarregar sem cache) — o bundle antigo estava em cache.
4. **Se estiverem ausentes**: investigar warning silencioso do Vite (ex.: erro de HMR) e ajustar.

Nenhum arquivo será modificado nesta etapa — é uma validação diagnóstica.

## Perguntas

- Você já tentou recarregar o preview com cache limpo (segurar o botão de reload)? Isso resolve 90% dos casos em que o código está no repositório mas a tela não muda.