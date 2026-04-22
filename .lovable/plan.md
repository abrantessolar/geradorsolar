
# Auditoria dos módulos de precificação e equipamentos

## Objetivo
Validar se os fluxos de precificação (calculadora, kits personalizados, custos de obra) estão consistentes entre si e se os equipamentos (placas, inversores, kits) estão sendo puxados das fontes corretas no banco de dados.

## Escopo da auditoria

### 1. Fontes de equipamentos
Verificar que cada tela consome a tabela correta:
- **Calculadora pública e autenticada** → `equipamentos_kits` (custo base por linha Plus/Prime Micro)
- **Kit personalizado** (`CustomKitForm`) → entrada manual + cálculo de Material CA via `calculations.ts`
- **Cadastro de obra** (`ProjetoForm`) → `equipamentos_placas` e `equipamentos_inversores`
- **Lista de materiais da obra** → `materiais_quantidades_padrao` cruzado com `materiais`
- **Dashboard de equipamentos instalados** → `projetos` + `clientes_base` (com parser)

### 2. Consistência da fórmula de preço
Conferir em todos os pontos onde há cálculo de venda:
- Fórmula padrão: `Preço = Custo Total / (1 - Margem%)`
- Composição do custo: Equipamento + Instalação (R$/placa) + Homologação (R$69) + Material CA (faixa pela potência real do inversor) + Cabo Tronco (Prime Micro)
- Validar que a margem sai de `getSettings()` (configurações) e não está duplicada/hardcoded
- Conferir se kit personalizado e kit padrão usam exatamente as mesmas constantes

### 3. Material CA por faixa de potência
- Verificar a tabela de faixas em `getCaMaterialCost()` (`src/data/calculations.ts`)
- Confirmar que usa a potência **real do inversor** do kit, não a estimada pelo kWp
- Para Prime Micro: validar `calcMicroInverterCount` × potência unitária do micro

### 4. Custos de obra (`custos_obra`)
- Comparar `custo_kit`, `custo_instalacao`, `custo_trt`, `custo_materiais` com a precificação da proposta original
- Validar se há divergência entre o preço de venda salvo na proposta e o `preco_venda` em `custos_obra`

### 5. Parser de equipamentos
- Revisar `equipmentParser.ts` contra amostras reais do banco (`projetos.dados_paineis`, `dados_inversor`)
- Confirmar normalização de marcas (ASTRONERGY, FOXESS, HOYMILES, GROWATT, DEYE)
- Validar detecção de Micro vs String (palavras-chave + potência < 3kW)

## Entregável

Relatório em chat (sem alterações de código nesta etapa) contendo:

1. **Mapa de fontes** — tabela mostrando cada tela × tabela do banco usada
2. **Divergências encontradas** — lista priorizada (crítica / média / baixa) com:
   - Arquivo e linha
   - Comportamento atual vs esperado
   - Impacto na precificação
3. **Amostras reais do banco** — consultas em `equipamentos_kits`, `custos_obra` e `projetos` para confirmar valores em produção
4. **Recomendações de correção** — pequenos patches sugeridos, agrupados por módulo

## Detalhes técnicos da investigação

Arquivos a inspecionar:
- `src/data/calculations.ts` — fórmulas centrais
- `src/data/store.ts` / `supabaseStore.ts` — settings e fetchers
- `src/components/CustomKitForm.tsx` — kit personalizado
- `src/pages/CalculatorPage.tsx` — calculadora autenticada
- `src/components/PublicSimulator.tsx` — simulador público
- `src/components/admin/EquipmentTab.tsx` — cadastro de kits
- `src/components/gestor/custos/CustosDashboard.tsx` + `CustoModal.tsx`
- `src/components/gestor/EquipmentDashboard.tsx`
- `src/components/gestor/materiais/generateMaterialList.ts`
- `src/components/gestor/equipmentParser.ts`

Consultas SQL de apoio:
- `SELECT linha, tipo, marca, potencia, preco_custo FROM equipamentos_kits WHERE ativo ORDER BY linha, potencia`
- `SELECT projeto_id, custo_kit, custo_instalacao, custo_materiais, preco_venda FROM custos_obra LIMIT 20`
- `SELECT id, dados_paineis, dados_inversor, marca_placa, marca_inversor FROM projetos WHERE dados_paineis IS NOT NULL LIMIT 30`

## Sem mudanças de código
Esta etapa é **somente leitura/análise**. Após a entrega do relatório, decidiremos juntos quais correções aplicar.
