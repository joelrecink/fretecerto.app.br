
## Ajuste: remover fallback para veículo pequeno

O sistema é exclusivo para **caminhão, carreta e caçamba**. Nenhum fluxo deve calcular ou sugerir rota como carro/veículo leve.

### Alterações em `supabase/functions/calculate-route/index.ts`

Na função `calculateHereRoute`, remover o último item do array `attempts`:

```ts
{ mode: 'car', label: 'car fallback', params: {} }
```

Assim os perfis tentados ficam apenas:
1. Truck com eixos/peso reais do usuário
2. Truck padrão 40t (6 eixos)
3. Truck sem restrições dimensionais

Se nenhum perfil de caminhão retornar rota navegável, o handler já responde 422 com mensagem clara ("Não foi possível calcular uma rota navegável para este veículo…"). Nada de silenciosamente cair para carro.

### Verificação de outras telas
Auditar rapidamente para confirmar que nenhum outro componente/edge function assume veículo leve:
- `analyze-route-ai` — checar prompt/parâmetros
- Formulários de cadastro de veículo — confirmar que só oferecem eixos/pesos de caminhão

Se algum texto ou opção mencionar "carro" / "veículo leve", removê-lo. (Provavelmente já não existe, mas confirmar.)

### Arquivos alterados
- `supabase/functions/calculate-route/index.ts` (remover attempt "car fallback")
- eventuais ajustes de labels se encontrados na auditoria
