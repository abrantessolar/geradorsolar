## Plano: Ativar pós-venda em Clientes → Instalados

### Confirmação (item 1)
Verificado: as tarefas de pós-venda (`tarefas_posvenda`) têm `ON DELETE CASCADE` nas duas chaves (`clientes_base` e `projetos`). Ao apagar um cliente/projeto, o pós-venda dele é apagado automaticamente. Nenhuma mudança necessária.

---

### O que será construído (item 2)

**1. Nova função de ativação por projeto** — `src/lib/posvendaTarefas.ts`
- Adicionar `ativarPosVendaProjeto({ projetoId, dataInstalacao, diaLeitura })`, espelhando `ativarPosVendaCliente`:
  - Checa duplicação por `projeto_id`.
  - Gera apenas lembretes futuros (`construirTarefas({ ..., onlyFuture: true })`).
  - Insere linhas com `projeto_id`.
  - Retorna o mesmo `AtivacaoResultado` (`created` + `proximo`).

**2. Botão "Ativar pós-venda" + input inline na lista Instalados** — `src/components/gestor/ProjetosUnificados.tsx`
- Carregar estado de pós-venda dos instalados: consultar `tarefas_posvenda` (por `cliente_base_id` e por `projeto_id`) e montar um `Set` de "ativos".
- Na coluna **Ações** da seção Instalados (desktop e mobile):
  - Se **já ativo** → badge verde `✓ Ativo` (sem ação).
  - Se **não ativo** → input numérico inline de **dia de leitura** (1–31, salva no `onBlur`) + botão `Zap` "Ativar pós-venda".
- Roteamento conforme origem:
  - id sem prefixo (cliente da base) → `ativarPosVendaCliente` + salvar `clientes_base.dia_leitura`.
  - id com prefixo `proj-` → `ativarPosVendaProjeto` + salvar `projetos.dia_leitura`.
- Mesmo fluxo do Admin: se `dia_leitura` vazio ao clicar Ativar, abrir prompt pedindo o dia, salvar e ativar.
- Toast de sucesso com quantidade de lembretes e próximo lembrete.
- Após ativar, marcar item como "Ativo" localmente.

**3. Remover "Ativar todos com dia de leitura"** — `src/components/admin/AtivarPosVendaTab.tsx`
- Remover o botão, a função `ativarTodos` e o estado `massa`. Mantém ativação individual e o resto da aba intactos.

---

### Detalhes técnicos
- `dataInstalacao` a partir de `c.instalado_em` usando `parseDate(s + 'T00:00:00')` (evita fuso).
- Status carregado uma vez em `ProjetosUnificados` (dois selects em `tarefas_posvenda`).
- Sem mudanças de banco: colunas (`clientes_base.dia_leitura`, `projetos.dia_leitura`, `tarefas_posvenda.projeto_id/cliente_base_id`) já existem.
