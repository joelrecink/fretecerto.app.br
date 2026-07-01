## Problema

O link atual do Google Maps usa 9 waypoints com prefixo `via:` + `dir_action=navigate`. Isso é o combo mais rígido possível — e é justamente o que faz o Maps devolver **"não foi possível calcular a rota"**:

- `via:` obriga o Google a passar exatamente pelo ponto. Se o ponto amostrado do polyline HERE cair num canteiro central, viaduto, trecho de sentido único contrário ou fora da malha do Google, a rota inteira é rejeitada.
- 9 pontos `via:` em sequência multiplicam a chance de pelo menos um falhar.
- `dir_action=navigate` piora: proíbe reotimização, então qualquer ponto ruim mata tudo.

## Correção em `src/components/frete/RouteMap.tsx` → `buildGoogleMapsUrlFromRoute`

1. **Reduzir para no máximo 3 waypoints âncora** (em vez de 9). Menos pontos = menor probabilidade de um deles ser irrotável. 3 âncoras bem escolhidas já forçam o Google a seguir o corredor rodoviário do caminhão em rotas longas.
2. **Remover o prefixo `via:`**. Waypoints normais permitem que o Google ajuste levemente para a rua mais próxima em vez de rejeitar tudo.
3. **Remover `dir_action=navigate`**. Deixa o Maps abrir na tela de preview de rota (que é o comportamento normal do compartilhamento), permitindo pequenos ajustes.
4. **Manter a amostragem por maior desvio** (Douglas-Peucker invertido) — a lógica está certa, só reduzir a contagem.
5. **Fallback seguro**: se a rota HERE tem menos de ~50 km ou menos de 20 pontos no polyline, não injetar waypoints amostrados — só usar origem + destino + paradas do usuário. Rotas curtas raramente precisam de trava e o risco de ponto ruim supera o benefício.

## Fora do escopo

- Não alterar `buildHereWeGoTruckUrl`, o GeoJSON ou os botões — só o gerador do link do Google Maps.
- Não mexer em edge functions.

## Observação honesta

Mesmo com 3 âncoras sem `via:`, o Google Maps **pode ainda sugerir um atalho pontual** entre duas âncoras se existir uma estrada bem mais curta liberada para carro. A trava perfeita só existe com o app de caminhão (HERE WeGo Truck). Este ajuste devolve a **abertura confiável** do link e mantém a rota **próxima** da do caminhão na maior parte do percurso — que era o objetivo do compartilhamento rápido pelo WhatsApp.
