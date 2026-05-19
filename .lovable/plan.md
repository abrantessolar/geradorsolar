## Reformular calculadora — kit manual + histórico

### 1. Banco de dados (migração)

Nova tabela `historico_kits`:
- `id` uuid PK
- `tipo_inversor` text ('string' | 'micro')
- `marca_inversor`, `modelo_inversor` text
- `potencia_inversor_kw` numeric
- `quantidade_inversores` int default 1
- `marca_placa`, `modelo_placa` text
- `potencia_placa_wp` numeric
- `quantidade_placas` int
- `custo_kit` numeric
- `usado_em` timestamptz default now()
- `vezes_usado` int default 1
- `criador_user_id` uuid (para isolar por vendedor)

Índice único em `(tipo_inversor, marca_inversor, modelo_inversor, potencia_inversor_kw, quantidade_inversores, marca_placa, modelo_placa, potencia_placa_wp, quantidade_placas, custo_kit)` para detectar combinação idêntica e incrementar `vezes_usado` via upsert.

RLS:
- SELECT/INSERT/UPDATE: autenticados com `acesso_painel_gestor=true` ou admin.

### 2. Remover (em `CalculatorPage.tsx` e arquivos auxiliares)

- Imports e uso de `findInverterForPanels`, `findPanel`, `findPriceTableEntry`, `priceTable`, `getPriceTable`, `syncKitsFromDB`, `syncPriceTableFromDB`, `LINES`, `LINE_NAMES`, `LINE_SUBS`, `selectedLine`, mapeamento por linha.
- Loop `LINES.map(...)` em `systemCards` — passar a calcular **um único card**.
- Cards de seleção (Plus / Prime Micro) e o toggle "Personalizar / Usar tabela".
- Componente `CustomKitForm` (será substituído por bloco inline novo).
- Lógica de `ptEntry`, `ptDetails`, `hasPriceTableCost`.

### 3. Novo bloco "Dados do Kit" (substitui System Cards)

Estado único:
```
kit = {
  tipoInversor: 'string' | 'micro',
  marcaInversor, modeloInversor, potenciaInversorKw, qtdInversores,
  marcaPlaca, modeloPlaca, potenciaPlacaWp, qtdPlacas,
  custoKit,
  precoVendaManual: number | null // null = usar calculado
}
```

UI (em `solar-card`):
1. **Toggle tipo de inversor** — Pills `[String] [Micro Inversor]` (destacado).
2. **Dados do inversor** — grid: Marca / Modelo / Potência (kW) / Quantidade.
3. **Dados das placas** — grid: Marca / Modelo / Potência (Wp) / Quantidade.
4. **Validador sobrecarga em tempo real** (usar `getOverloadStatus`):
   - String: kWp / `potencia_inversor_kw`
   - Micro: kWp / (`qtd_inversores` × `potencia_inversor_kw`)
   - Badges 🟢 ≤1.5 / 🟡 1.5–1.7 / 🔴 >1.7.
5. **Custo do kit** — `MoneyInput` BRL.
6. **Detalhamento calculado** (recalcula em tempo real):
   - Custo do kit
   - Instalação (`qtdPlacas × settings.installationPricePerPanel`)
   - Homologação (`settings.homologationPrice`)
   - Material CA (`getCaMaterialCost` — micro: usa `qtd × potencia`)
   - Cabo tronco (`calcTrunkCableCost` se micro e qtd-1 > 0)
   - Custo total + Margem (%) + Preço de venda calculado
7. **Preço de venda editável** (`MoneyInput`):
   - Pré-preenchido com calculado; ao editar manualmente → exibir "Margem resultante: X%".
   - Botão pequeno "↺ Recalcular" para voltar ao calculado.

### 4. Botão e painel "📋 Kits usados anteriormente"

- Botão ao lado do título do bloco.
- Abre `Popover` (shadcn) com:
  - Input de busca (filtra por marca/modelo inversor ou placa).
  - Lista ordenada por `vezes_usado DESC, usado_em DESC` (limit 20).
  - Cada item: linha-resumo (`SOFAR 4kW + ASTRONERGY 580Wp × 10`), custo, "há X dias", botão **Usar este kit**.
- Ao clicar "Usar este kit": preencher todo `kit` (incluindo `custoKit`), resetar `precoVendaManual` para null (recalcular).

### 5. Persistência ao gerar proposta

Em `generateProposal`:
- Upsert em `historico_kits` (match pela combinação completa). Se existe → `vezes_usado += 1, usado_em = now()`. Se não → insert.
- Adaptar `selectedKit` no objeto `Proposal`: sempre tratar como custom kit (atual `customKit` path). Manter retro-compatibilidade nas páginas que consomem `Proposal` (apenas o que importa: marca/modelo/potência/qtd dos dois lados, micro count, total).
- Remover `selectedLine`/seleção de card — sempre gera direto.

### 6. Manter sem alteração

- Dados do cliente, distribuidora, UCs (média/mês a mês), equipamentos adicionais, gráfico, ajuste +/− placas (sincroniza `kit.qtdPlacas` com `finalPanels`), indicadores consumo/geração/excedente, financiamento (fórmulas fixas), parcelas cartão, retorno financeiro, edge function de envio, layout PDF.

### 7. Ajuste do ajuste de placas

O bloco "Ajustar Quantidade de Placas" continua usando `basePanelCount` calculado por consumo. Quando o usuário mexe nos +/−, atualiza `kit.qtdPlacas`. Se o usuário editar `kit.qtdPlacas` manualmente no bloco do kit, sincroniza de volta (single source of truth = `kit.qtdPlacas`, com botão de "alinhar com dimensionamento").

### Detalhes técnicos

- Novo componente: `src/components/calculator/KitManualForm.tsx` (bloco completo: toggle, dados, custo, detalhamento, preço editável, botão histórico).
- Novo componente: `src/components/calculator/HistoricoKitsPopover.tsx`.
- Helper `src/data/kitHistory.ts`: `listKitsHistory()`, `upsertKitHistory(kit)`, função que constrói chave de comparação.
- Remover/depreciar: `CustomKitForm.tsx` (manter apagado), referências em `priceTable` permanecem usadas pelo Admin/outras telas (não tocar).
- Tipos: estender `Proposal.customKit` para incluir `qtdInversores` e `tipoInversor` ('string'|'micro').
- Card único renderiza no lugar do grid de 2 cards.
