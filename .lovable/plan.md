## Objetivo

Três ajustes pequenos, todos de frontend (sem mudança de banco — as colunas `dia_leitura`, `nome_planta` e `marca_inversor` já existem na tabela `projetos`).

---

### 1. Mover "Dia de leitura aproximado da conta" para o passo 3

No formulário de Novo Projeto (`ProjetoForm.tsx`), o campo `📅 Dia de leitura aproximado da conta de luz (1 a 31)` está hoje no passo **4 (Comercial)**. Vamos movê-lo para o passo **3 (Unidades Consumidoras)**, que é o contexto mais natural.

- Remover o `<div>` do campo `dia_leitura` do bloco `step === 4`.
- Inseri-lo logo abaixo do componente `UnidadesConsumidorasStep` dentro do bloco `step === 3`, mantendo o mesmo estado (`form.dia_leitura`) e o mesmo salvamento já existente. Nenhuma lógica de cálculo muda.

---

### 2. Perguntar e armazenar "Nome da Planta" ao marcar "Criar planta no monitoramento"

Na aba **Acompanhamento** (`ListaAcompanhamento.tsx`), a etapa do Fluxo 3 "Criar planta no monitoramento" (fluxo 3, etapa 6) passará a, ao ser **marcada**, abrir um mini-prompt inline pedindo o **Nome da Planta**.

- Trazer `nome_planta` do projeto na query e no tipo `ProjetoLista`.
- Ao marcar a etapa 6, exibir um campo inline (padrão semelhante ao mini-modal de "local de entrega"), pré-preenchido com o `nome_planta` atual do projeto, se existir.
- Ao confirmar:
  - Gravar em `projetos.nome_planta` (assim a informação fica sincronizada com a que é pedida no Novo Projeto — uma atualiza a outra).
  - Guardar também em `campo_extra.nome_planta` da própria etapa, para referência local, e marcar a etapa como concluída.
- Como o Novo Projeto e o Acompanhamento gravam no **mesmo campo** `projetos.nome_planta`, preencher num lugar reflete no outro.

---

### 3. Rótulo do cliente na aba Pós-venda

Na aba **Pós-venda** (`PosVendaAgenda.tsx`), hoje aparece só o nome do cliente. Passará a exibir:

```text
Nome do Cliente — Marca do Inversor — Nome da Planta
```

- Incluir `marca_inversor` e `nome_planta` no `select` da query de `tarefas_posvenda` (já faz join com `projetos`).
- Montar o rótulo concatenando as partes existentes, ignorando as que estiverem vazias (ex.: se não houver nome da planta, mostra só `Nome — Marca`).
- Aplicar o mesmo rótulo no cabeçalho de cada tarefa da lista.

---

### Detalhes técnicos

- **Arquivos alterados:**
  - `src/components/gestor/ProjetoForm.tsx` — mover campo `dia_leitura` do step 4 para o step 3.
  - `src/components/gestor/acompanhamento/ListaAcompanhamento.tsx` — adicionar `nome_planta` ao tipo/query; prompt inline na etapa (3,6); gravar em `projetos.nome_planta` + `campo_extra`.
  - `src/components/gestor/posvenda/PosVendaAgenda.tsx` — query e rótulo com nome + marca do inversor + nome da planta.
- **Banco de dados:** nenhuma migração necessária.
