## Objetivo
1. Permitir que campos numéricos aceitem vazio (null) sem forçar 0, e aceitem entrada tipo `,50` (decimal iniciando por vírgula).
2. Ativar ditado por voz nos campos de endereço de Coleta e Entrega (ícone de microfone que hoje é decorativo).

## Alterações

### 1. Campos numéricos (aceitar vazio + `,xx`)
Arquivos afetados (todos usam o mesmo padrão `parseFloat(...) || 0` que zera o campo):
- `src/components/frete/screens/PickupScreen.tsx` (peso, valor/ton, valor total)
- `src/components/frete/screens/DeliveryScreen.tsx` (valor adicional)
- `src/components/frete/screens/CostsMaintenanceScreen.tsx` (custos fixos e por km)
- `src/components/frete/screens/OperationalScreen.tsx` (capacidade, consumo, etc.)
- `src/components/frete/screens/IdentificationScreen.tsx` (se houver campos numéricos)
- `src/components/frete/SpeechInput.tsx` (helper base)

Mudanças de comportamento:
- Enquanto o usuário digita, manter o texto bruto (`"", ",", ",5", "1,"`).
- Só converter para número no `onBlur` ou ao usar o valor (cálculo).
- Aceitar `,xx` → normalizar internamente para `0,xx` no cálculo (`",50"` vira `0.5`).
- Campo vazio → `null`/`undefined` no estado (não `0`); exibir placeholder em vez de `0`.
- Regex de aceitação: `^\d*[.,]?\d{0,2}$` (limite de 2 casas quando aplicável — sem limite para peso).

Ajuste equivalente no `SpeechInput` para não coagir string vazia a `0`.

### 2. Ditado por voz nos endereços
Hoje o botão de microfone em `PickupScreen` e `DeliveryScreen` é apenas visual. Vou:
- Criar um hook `useSpeechToText(lang='pt-BR')` reutilizável usando Web Speech API (`webkitSpeechRecognition`), retornando `{ isListening, start, stop, supported }`.
- Passar callback ao `AddressAutocomplete` via nova prop `onVoiceTranscript(text)` que:
  - preenche o campo (`onTextChange`)
  - dispara a busca do autocomplete
- Trocar o botão `rightSlot` decorativo por um botão funcional que alterna gravação; animação vermelha pulsante quando ativo (padrão já usado em `SpeechInput`).
- Fallback: se `webkitSpeechRecognition` indisponível, esconder o botão e mostrar tooltip "Voz não suportada".

Arquivos:
- Novo: `src/hooks/useSpeechToText.tsx`
- Atualizar: `src/components/frete/AddressAutocomplete.tsx` (aceitar prop `onVoiceTranscript` opcional e renderizar botão interno de mic quando fornecida)
- Atualizar: `src/components/frete/screens/PickupScreen.tsx` e `DeliveryScreen.tsx` para passar o callback em vez do botão estático.

## Fora de escopo
- Não alterar lógica de cálculo (apenas tratar `null`/`""` como 0 no momento do cálculo).
- Não trocar engine de STT (usar Web Speech API nativa; sem chamada a edge function/AI Gateway para manter simples e offline-friendly).
