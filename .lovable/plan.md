# Desativar pós-venda e alterar dia de leitura

Adicionar controle para desativar o pós-venda de um cliente (excluindo todas as tarefas pendentes) e para editar o dia de leitura recalculando todas as datas restantes. Disponível em dois lugares: **Agenda de Pós-venda** e **modais de edição do cliente/projeto**.

## 1. Núcleo (helpers em `src/lib/posvendaTarefas.ts`)

Três funções novas, todas idempotentes e filtrando por `projeto_id` ou `cliente_base_id`:

- `desativarPosVenda({ projetoId?, clienteBaseId? }): Promise<number>` — `DELETE FROM tarefas_posvenda WHERE owner match AND concluido = false`. Retorna quantas foram removidas. Tarefas concluídas ficam intactas (histórico).
- `contarTarefasPendentes({ ownerFilter })` — para exibir "X lembretes pendentes" no botão de confirmação.
- `reativarPosVenda({ projetoId?, clienteBaseId?, dataInstalacao, diaLeitura })` — wrapper que chama `gerarTarefasPosVenda` (já é idempotente via `ON CONFLICT`), útil para expor uma API única do fluxo.

A função `sincronizarDiaLeitura` já existente continua sendo usada quando o usuário só troca a data de leitura sem desativar.

## 2. Agenda de Pós-venda (`PosVendaAgenda.tsx`)

Hoje a lista mostra tarefas soltas. Vamos **agrupar por cliente** (chave: `projeto_id ?? cliente_base_id`). Cada grupo ganha um cabeçalho com:

- Nome, marca do inversor, planta, avaliação (o que já existe hoje, movido para o header do grupo).
- Badge com o dia de leitura atual (ex.: `Leitura dia 15`) ou `⚠️ Sem dia de leitura`.
- Botão **✏️ Editar dia de leitura** → abre popover pequeno com input numérico (1–28) + Salvar. Ao salvar: `UPDATE projetos/clientes_base SET dia_leitura` e chama `sincronizarDiaLeitura` (recalcula todas as pendentes ancoradas em conta e limpa `aguardando_leitura`). Toast: "Datas recalculadas".
- Botão **🚫 Desativar pós-venda** → abre um `AlertDialog` com contagem: "Isto vai excluir N lembretes pendentes deste cliente. Tarefas já concluídas serão preservadas como histórico. Deseja continuar?". Confirma → `desativarPosVenda` → toast + `load()`.
- Se o cliente **não tem pendentes** (todas concluídas ou desativado): mostrar botão **▶️ Reativar pós-venda** (aparece só se houver `data_instalacao`). Confirma → `reativarPosVenda` → toast + `load()`.

Para saber quais clientes estão "desativados mas elegíveis", a query passa a incluir também clientes com projeto instalado sem nenhuma tarefa pendente — filtro `pendentes` (padrão) esconde grupos vazios, filtro `todas`/`concluidas` mostra o cabeçalho com o botão Reativar.

## 3. Modais de edição

**`ClienteEditModal.tsx`** e **`ProjetoForm.tsx`** (e `ProjetosUnificados.tsx`/`AtivarPosVendaTab.tsx` onde já editam `dia_leitura`): adicionar uma seção **"Pós-venda"** logo abaixo do campo `dia_leitura`:

- Se existem tarefas pendentes: botão vermelho **Desativar pós-venda** (mesmo AlertDialog com contagem).
- Se não existem pendentes e há `data_instalacao`: botão verde **Reativar pós-venda**.
- Se `data_instalacao` está vazia: linha informativa "O pós-venda é iniciado ao concluir a obra".

A lógica que já sincroniza ao salvar `dia_leitura` permanece; só adicionamos a possibilidade de o usuário desativar/reativar dali sem fechar o modal.

**Reativação automática**: quando o usuário salva um `dia_leitura` em um cliente que está **desativado** (0 pendentes) **e** tem `data_instalacao`, mostrar um `confirm` inline: "Este cliente está com pós-venda desativado. Deseja reativar os lembretes agora?" — se sim, `reativarPosVenda`. Se não, apenas salva o dia_leitura (não gera nada).

## 4. Detalhes técnicos

- **Sem migração de banco**: `DELETE` é suficiente para "excluir pendentes"; o histórico de concluídas fica na mesma tabela.
- **Filtro de dono**: sempre `.eq('projeto_id', id)` OU `.eq('cliente_base_id', id)` — nunca ambos, para não apagar tarefas de outro cliente.
- **Idempotência da reativação**: `gerarTarefasPosVenda` já usa `ON CONFLICT DO NOTHING` na chave `(owner, template_key)`, então reativar após uma desativação parcial não duplica.
- **Contadores** (`usePosVendaHoje`, badge do menu): sem mudança de lógica — passam a refletir os deletes automaticamente porque leem a mesma tabela.
- **Sheets sync**: nenhum, pós-venda é local.

## 5. Arquivos afetados

- `src/lib/posvendaTarefas.ts` — novas funções `desativarPosVenda`, `contarTarefasPendentes`, `reativarPosVenda`.
- `src/components/gestor/posvenda/PosVendaAgenda.tsx` — agrupamento por cliente, header com badges e botões, popover de edição do dia de leitura, AlertDialog de desativação/reativação.
- `src/components/gestor/ClienteEditModal.tsx`, `src/components/gestor/ProjetoForm.tsx`, `src/components/gestor/ProjetosUnificados.tsx`, `src/components/admin/AtivarPosVendaTab.tsx` — seção "Pós-venda" com botões Desativar/Reativar e prompt de reativação automática ao salvar `dia_leitura`.
