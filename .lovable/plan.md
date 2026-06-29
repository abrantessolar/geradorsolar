## Visão geral

Cinco ajustes no módulo de Clientes / Acompanhamento / Pós-venda. Nenhuma tabela nova; uso de colunas que já existem (`projetos.distribuidor`, `projetos.wifi_nome`, `projetos.wifi_senha`, `data_nascimento`).

---

### 1. Lembrete de aniversário no pós-venda (1 por ano, 3 anos)

- Adicionar o tipo `aniversario` à lógica de pós-venda (rótulo "🎂 Aniversário").
- Ao gerar as tarefas de pós-venda, se houver data de nascimento do cliente, criar **uma tarefa de aniversário para cada ano** dentro da janela de 3 anos (próximo aniversário após a instalação + 2 anos seguintes).
- Cada tarefa traz uma mensagem de WhatsApp pronta (novo modelo editável no Admin → WhatsApp).
- A data de nascimento passará a ser lida na geração de tarefas (tanto ao concluir a instalação no Acompanhamento quanto ao ativar pós-venda em Instalados / Admin).
- As tarefas aparecem normalmente na Agenda de Pós-venda, com filtros e botões existentes (Concluído, WhatsApp, Adiar).

### 2. Acesso ao checklist e link após a obra concluída (nos dois lugares)

- **Aba Acompanhamento**: adicionar um filtro "Concluídas" que também lista as obras já instaladas, mostrando o checklist completo das etapas (continua editável) e o botão de link de rastreamento. Hoje a lista esconde tudo que está "Instalado".
- **Lista de Instalados** (Clientes → Projetos): adicionar nas ações de cada cliente instalado um botão de **link de rastreamento** (gerar/copiar/WhatsApp) e um botão para abrir o **checklist de etapas** da obra.

### 3. Fornecedor obrigatório ao marcar "Pedido de compra realizado"

- No Acompanhamento, ao marcar a etapa "Pedido de compra realizado" (Equipamentos), abrir um mini-campo inline pedindo o **fornecedor**. Só conclui a etapa após informar.
- O valor é salvo no campo **Distribuidor** do projeto (e registrado também na etapa para histórico). Reabrir o campo mostra o valor atual.

### 4. Captura de WiFi ao marcar "Conectar logger no WiFi"

- No Acompanhamento, ao marcar a etapa "Conectar logger no WiFi" (Instalação), abrir um mini-formulário pedindo **Nome da Rede WiFi** e **Senha**.
- Esses valores **atualizam os campos `wifi_nome` e `wifi_senha` do projeto** (que já existem e aparecem na edição). Vêm pré-preenchidos se já houver algo salvo.

### 5. Conciliar os campos de edição (Aguardando × Instalados)

Problema relatado: os dois editores não têm os mesmos campos e dados "somem" ao mudar de status.

- Alinhar o conjunto de campos entre o **Editar Projeto** (obras Aguardando) e o **Editar Cliente** (Instalados), adicionando os que faltam em cada um:
  - Garantir nos dois: dia de leitura, estrutura de fixação, cabo usado, fornecedor/distribuidor, WiFi (nome/senha), nome da planta, satisfação.
- Revisar o mapeamento usado quando um projeto vira "Instalado" para que **nenhum campo preenchido seja descartado** na conversão (ex.: dia de leitura, estrutura, geração estimada, e-mail, datas de workflow).
- Padronizar o nome do campo de fornecedor entre as telas (projeto usa "Distribuidor"; cliente usa "Fornecedor" → mesma coluna), deixando claro que é o mesmo dado.

---

## Detalhes técnicos

- `src/lib/posvendaTarefas.ts`: novo tipo `aniversario`; `construirTarefas` passa a aceitar `dataNascimento` e gera linhas anuais de aniversário dentro da janela de 3 anos; `gerarTarefasPosVenda`, `ativarPosVendaCliente` e `ativarPosVendaProjeto` recebem/repasse de `dataNascimento`.
- Novo modelo em `whatsapp_templates` (tipo aniversário) via insert de dados.
- `ListaAcompanhamento.tsx`: buscar `data_nascimento`; filtro "Concluídas" (carrega também status Instalado/Homologado em modo leitura+link); mini-modais de fornecedor (etapa Equipamentos 1 → `distribuidor`) e WiFi (etapa Instalação 5 → `wifi_nome`/`wifi_senha`).
- `ProjetosUnificados.tsx`: botões de link de rastreamento e checklist na linha de Instalados; mapear `data_nascimento` em `fromProjetos`.
- `ClientesPage.tsx`: incluir `data_nascimento` no objeto mapeado dos instalados.
- `ProjetoForm.tsx` e `ClienteEditModal.tsx`: adicionar os campos faltantes para igualar os dois editores.
- `src/components/gestor/posvenda/PosVendaAgenda.tsx` / `TarefaPosVendaItem.tsx`: suporte ao ícone/rótulo do tipo aniversário (a estrutura genérica já cobre a renderização).

Sem mudanças de schema (todas as colunas necessárias já existem); apenas inserção do novo modelo de WhatsApp.