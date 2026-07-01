## Objetivo

Substituir os inputs de endereço em **Coleta** e **Entrega** por um autocomplete que sugere endereços reais enquanto o usuário digita. Ao selecionar uma sugestão, o endereço fica com formato válido + `lat/lng` já preenchidos, eliminando erros como "Vrihft" e economizando chamadas de geocoding no `calculate-route`.

## Provider

**HERE Autosuggest API** (`https://autosuggest.search.hereapi.com/v1/autosuggest`).
- Motivo: já temos `HERE_API_KEY` configurada e o HERE é o provedor principal de rota/pedágio; usar o mesmo motor evita divergência entre endereço sugerido e endereço geocodificado depois.
- Filtro por Brasil (`in=countryCode:BRA`), idioma `pt-BR`, `limit=6`.
- Chave server-side protegida por edge function proxy — nunca exposta no bundle.

## Arquitetura

**Nova edge function `address-autocomplete`** (`supabase/functions/address-autocomplete/index.ts`):
- `GET ?q=<texto>&lat=<opt>&lng=<opt>`
- Requer JWT (mesmo padrão de `calculate-route`).
- Valida `q` (mínimo 3 caracteres, máximo 200, regex de caracteres permitidos).
- Chama HERE Autosuggest, retorna array normalizado: `{ id, label, address, lat, lng }`.
- Cache de 60s via header `Cache-Control` para reduzir custo.

**Novo componente `src/components/frete/AddressAutocomplete.tsx`**:
- Props: `value`, `onChange(address, coords?)`, `placeholder`, `id`.
- Input controlado + dropdown com sugestões (usa componentes `Command`/`Popover` do shadcn, já disponíveis).
- Debounce de 300 ms antes de chamar a edge function.
- Teclado: setas ↑↓ para navegar, Enter para selecionar, Esc para fechar.
- Ao selecionar: chama `onChange(item.label, { lat, lng })` e fecha o dropdown.
- Mostra estado "buscando…" e "nenhum resultado".

**Integração nas telas**:
- `PickupScreen.tsx` e `DeliveryScreen.tsx`: trocar o `<Input>` do endereço pelo `<AddressAutocomplete>`.
- `Index.tsx` (`onUpdatePickup`/`onUpdateDelivery`): aceitar `coords` opcional e gravar `lat`/`lng` no item de rota — o `useRouteCalculation` já envia esses campos para o backend quando presentes, então o `calculate-route` pula o geocode.
- Se o usuário editar o texto depois de ter selecionado uma sugestão, limpar `lat`/`lng` (força nova seleção ou fallback para geocode).

## Comportamento e UX

- Digitação livre continua permitida (não bloquear submit se o usuário não escolher sugestão) — o backend fará geocode como fallback.
- Um badge verde discreto ("✓ endereço confirmado") aparece quando `lat/lng` está preenchido, indicando que aquele endereço não vai gastar geocoding extra.
- Sem alterações em cores/tipografia/layout: reaproveita tokens existentes.

## Arquivos

- Novo: `supabase/functions/address-autocomplete/index.ts`
- Novo: `src/components/frete/AddressAutocomplete.tsx`
- Editado: `src/components/frete/screens/PickupScreen.tsx`
- Editado: `src/components/frete/screens/DeliveryScreen.tsx`
- Editado: `src/pages/Index.tsx` (handler aceita `coords` e limpa ao editar texto)

Sem novas dependências, sem alterações de schema, sem novos secrets (usa `HERE_API_KEY` existente).
