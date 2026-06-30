## Objetivo

Corrigir o motor de cálculo do FreteCerto consolidando três frentes:
1. Bug de dupla contagem de combustível no detalhamento salvo.
2. Inconsistências de proporcionalidade (mensal/diário, encargos, dias, ARDA, consumo vazio).
3. Permitir editar a distância de deslocamento no retorno vazio.

Sem mexer em edge functions, domínio, SSL ou publicação.

## Alterações

### A. `src/pages/Index.tsx` — função `handleCalculate`

1. **Corrigir dupla contagem de combustível**
   - Calcular `maintenanceVariableOnly = (totalPerKmCost − fuelPerKm) × distance`.
   - Em `tripHistory` salvar `estimated_maintenance_cost = maintenanceVariableOnly` e manter `estimated_fuel_cost` separado.
   - `totalCost` continua o mesmo (sempre usou `maintenanceCostForTrip` só uma vez).

2. **Padronizar mensal → dia**
   - Trocar `/30` por `/30.44` em `dailyParking`, `dailyTracking`, `dailyAccounting`, `dailyOtherFixed`.

3. **Encargos sobre a folha (opcional)**
   - Aplicar `dailySalary × (1 + payrollChargesPercentage/100)`.
   - Default 0 → comportamento atual preservado.

4. **Horas de espera do ARDA configurável**
   - Usar `vehicle.estimatedWaitHoursPerDay ?? 2` em vez da constante `2`.

5. **Dias com repouso semanal (Lei do Motorista)**
   - `effectiveDays = ceil(durationHours / drivingHoursPerDay)`
   - `weeklyRestDays = floor(effectiveDays / 6)`
   - `days = effectiveDays + weeklyRestDays`
   - Para viagens ≤6 dias o resultado é igual ao atual.

### B. `src/types.ts` e tipagem local em `Index.tsx`

Adicionar campos opcionais em `Vehicle`:
- `payrollChargesPercentage?: number` (default 0)
- `estimatedWaitHoursPerDay?: number` (default 2)

### C. Migration no banco

Adicionar colunas na tabela `vehicles`:
- `payroll_charges_percentage numeric default 0`
- `estimated_wait_hours_per_day numeric default 2`

Atualizar leitura/escrita em `Index.tsx` (mapeamento `v → vehicle` e `vehicle → upsert`).

### D. `src/components/frete/screens/CostsMaintenanceScreen.tsx`

Acrescentar:
- Input "% Encargos sobre a folha" (perto de "Incluir 13º").
- Input "Horas de espera por dia (carga/descarga)" (perto do toggle ARDA).

### E. `src/components/frete/screens/TripSummaryScreen.tsx` — retorno vazio editável

1. Novo estado `returnDistance: number`, inicializado com `estimatedDistance` quando o toggle vira ativo.
2. Substituir uso de `estimatedDistance` no cálculo de retorno por `returnDistance`.
3. Aplicar fator de consumo vazio: usar `consumoEfetivo = fuelConsumption / 0.75` (caminhão vazio rende ~33% mais).
   - `fuelCost = (returnDistance / consumoEfetivo) × fuelPrice`
   - `maintenanceCost = returnDistance × 0.20`
4. Nova UI dentro do bloco do toggle (quando ativo):
   - Campo numérico "Distância de retorno (km)" com `inputMode="decimal"`.
   - Botão pequeno "Usar distância da ida" que reseta para `estimatedDistance`.
   - Mostra custo estimado em R$ atualizando em tempo real.
5. `onCalculate(includeReturn, estimatedReturnCost)` mantém a mesma assinatura.

### F. Sem alterações

- Edge functions (`calculate-route`, `analyze-route-ai`, `stripe-webhook`, etc.).
- Cliente do backend (`integrations/supabase/client.ts`).
- Configuração de domínio / SSL / publicação.

## Validação

1. **Viagem curta (1 dia, 500 km)**: `totalCost` igual ao atual ±0,5%.
2. **Viagem 5 dias, 2.500 km**: fixos mensais caem ~1,5% (efeito do `/30.44`).
3. **Viagem 10 dias, 5.000 km**: adiciona 1 dia de repouso semanal, refletido no `fixedCostForTrip`.
4. **Soma do detalhamento salvo** (`fuel + tolls + commission + maintenance + fixed + arda + retorno`) bate com `totalCost` (sem duplicar combustível).
5. **Pizza do Dashboard**: combustível aparece em fatia única, manutenção variável sem somar combustível.
6. **Retorno vazio**: alterar a distância de retorno reduz proporcionalmente o custo de retorno e o `totalCost`.
7. **ARDA**: alterar horas de espera por dia muda o `ardaCost` proporcionalmente.
8. **Encargos**: definir 40% aumenta `dailySalary` em 40%.