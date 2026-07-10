# Sincronizar lembretes de pós-venda com a conta de luz

Hoje os lembretes de "verificar geração" usam prazos fixos (+30, +60, +90 dias, etc.) que ficam dessincronizados da chegada da conta de luz. Vamos ancorar tudo no `dia_leitura` do cliente, de forma que cada verificação de geração caia 3 dias antes da respectiva solicitação de conta.

## 1. Nova lógica de datas (`src/lib/posvendaTarefas.ts`)

A função `dataConta(instalacao, dia_leitura, N)` já existe e produz exatamente as datas do exemplo (instalação 01/04 + leitura 15 → 1ª conta 20/05, 2ª 20/06, 3ª 20/07). Vamos reestruturar o `PLANO` para que **todos** os lembretes mensais derivem dessa âncora:

- `data_conta_N` = 1ª leitura após instalação + (N−1) meses + 5 dias (fatura chega)
- `data_geracao_N` = `data_conta_N` − 3 dias
- `data_avaliacao` = `data_conta_3` + 3 dias

`PlanoItem` ganha dois campos: `conta` (nº da conta âncora) e `offsetDias` (deslocamento em dias em relação à `data_conta`). O `PLANO` passa a ser:

```text
FASE 2
  Verificar geração +2 dias      dias:2   (fixo — confirma que ligou)
  Verificar geração +7 dias      dias:7   (fixo — 1ª semana)
  Verificar geração — mês 1      conta:1  offset:-3
  Solicitar 1ª conta             conta:1  offset:0
  Verificar geração — mês 2      conta:2  offset:-3
  Solicitar 2ª conta             conta:2  offset:0
  Verificar geração — mês 3      conta:3  offset:-3
  Solicitar 3ª conta             conta:3  offset:0
  Avaliação Google               conta:3  offset:+3
FASE 3
  Verificar geração 6 meses      conta:6  offset:-3
  Verificar geração 1 ano + Ind. conta:12 offset:-3
FASE 4 (trimestral)
  15/18/21/24/27/30/33/36 meses  conta:N  offset:-3
```

Os `+2 dias` e `+7 dias` continuam fixos a partir da instalação. Os campos `dias`/`meses` antigos são substituídos por `conta`/`offsetDias` nos itens mensais.

## 2. Caso `dia_leitura` não preenchido

Hoje, sem `dia_leitura`, o código usa o dia da instalação como fallback silencioso — o que gera datas erradas. Novo comportamento:

- Adicionar coluna `aguardando_leitura boolean not null default false` em `tarefas_posvenda` (migração).
- Ao gerar tarefas sem `dia_leitura`: criar `+2 dias` e `+7 dias` normalmente e criar os lembretes mensais com `aguardando_leitura = true` e uma data provisória (dia da instalação) apenas para satisfazer o `NOT NULL`.
- Criar `sincronizarDiaLeitura({ ownerFilter, dataInstalacao, diaLeitura })` que recalcula `data_programada` e zera `aguardando_leitura` de todas as tarefas mensais pendentes daquele cliente/projeto (identificadas pelo `template_key`).
- Chamar essa sincronização sempre que o `dia_leitura` for salvo em: `ClienteEditModal.tsx`, `ProjetoForm.tsx`, `ProjetosUnificados.tsx` (`salvarDiaLeitura`) e `AtivarPosVendaTab.tsx` (`saveDiaLeitura`/`confirmarPrompt`).

## 3. Exibição do lembrete (`TarefaPosVendaItem.tsx` + `PosVendaAgenda.tsx`)

- `PosVendaAgenda` passa a selecionar `instalado_em`/`data_instalacao` e `dia_leitura` do projeto/cliente e repassa ao item.
- Para tarefas com `aguardando_leitura = true`: exibir badge `⚠️ Aguardando dia de leitura` no lugar da data/contagem, e desabilitar "Adiar".
- Para verificações de geração ancoradas na conta (todas menos `+2 dias`/`+7 dias`), mostrar bloco de contexto:

```text
📊 Verificar geração — Mês 3
Instalado em: 01/04/2026
Leitura prevista: dia 15
Solicitar conta em: 20/07/2026 (daqui 3 dias)
```

A data "Solicitar conta em" = `data_programada + 3 dias`; "(daqui X dias)" é calculado em relação a hoje.

- `usePosVendaHoje.ts`: contar apenas tarefas com `aguardando_leitura = false` (não contabilizar as pendentes de leitura).

## 4. Textos de WhatsApp (dados)

Atualizar/garantir os templates em `whatsapp_templates` com os textos sugeridos (verificação mês 1/2/3 e solicitações de conta 1/2/3). Será necessário um novo `template_key` `geracao_3meses` para a verificação do 3º mês (o `geracao_3meses_google` existente passa a ser exclusivo da tarefa de Avaliação Google). Feito via ferramenta de dados (upsert), preservando a possibilidade de o usuário editar depois.

## Detalhes técnicos

- Migração: `ALTER TABLE public.tarefas_posvenda ADD COLUMN aguardando_leitura boolean NOT NULL DEFAULT false;` (sem novos GRANT/policy — a tabela já os possui).
- `construirTarefas` retorna `aguardando_leitura` por linha; `TarefaRow` e a interface `TarefaPosVenda` ganham o campo.
- Mapa `template_key → { conta, offsetDias }` exportado do `posvendaTarefas.ts` para reuso na sincronização e na exibição.
- Sem alteração de regra de negócio fora do pós-venda; mudanças concentradas em `posvendaTarefas.ts`, componentes de pós-venda e um upsert de templates.

## Arquivos afetados

- `src/lib/posvendaTarefas.ts` (lógica central)
- `src/components/gestor/posvenda/TarefaPosVendaItem.tsx`
- `src/components/gestor/posvenda/PosVendaAgenda.tsx`
- `src/components/gestor/posvenda/usePosVendaHoje.ts`
- `src/components/gestor/ClienteEditModal.tsx`, `ProjetoForm.tsx`, `ProjetosUnificados.tsx`, `src/components/admin/AtivarPosVendaTab.tsx` (gatilho de sincronização)
- Migração para `aguardando_leitura` + upsert de `whatsapp_templates`
