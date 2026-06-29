# Unificar os campos da obra (fonte única de verdade)

## O problema hoje

Os mesmos dados vivem em dois lugares e nem sempre conversam:

- **Etapas da Obra (Acompanhamento)** grava em `rastreamento_obras.campo_extra` (um "saco" de JSON por etapa).
- **Workflow / Logística / Monitoramento / Financeiro / Instalação** usa colunas próprias da tabela de projetos (ex.: data de aprovação, distribuidor, WiFi, nome da planta, data de instalação).

Resultado atual, etapa por etapa:

```text
Etapa marcada no Acompanhamento     → onde grava hoje                 → problema
Projeto protocolado (Homolog.)      → só marca o check               → NÃO grava "Projeto enviado em"
Projeto aprovado (Homolog.)         → só marca o check               → NÃO grava "Projeto aprovado em"
Pedido de compra / Fornecedor       → campo_extra + Distribuidor      → duplicado (pode divergir)
Material entregue (local)           → só campo_extra                  → NÃO grava "Local de entrega" do projeto
Aguardando instalação (Nº fila)     → só campo_extra                  → sem campo fixo, some na edição
Instalação agendada (Data)          → só campo_extra                  → sem campo fixo, some na edição
WiFi (rede/senha)                   → campo_extra + colunas WiFi      → duplicado
Criar planta (nome)                 → campo_extra + Nome da Planta    → duplicado
```

Ou seja: alguns dados se perdem (não chegam às colunas usadas pela edição e pelo "Ver dados") e outros ficam gravados em dobro, podendo divergir.

## A solução

Definir as **colunas do projeto como fonte única de verdade** de todo dado que também é exibido/editado em outro lugar. O `rastreamento_obras` continua sendo o registro das **etapas** (concluído sim/não, data, hora e usuário — para o histórico e a tooltip), mas **o valor em si** (fornecedor, fila, datas, WiFi, planta, entrega) passa a morar só na coluna canônica.

Assim:
- Preencher no Acompanhamento atualiza o campo "antigo" automaticamente (e vice-versa).
- Editar em Projetos/Instalados reflete no Acompanhamento.
- Nada é gravado em dobro nem se perde ao mudar de status.

### Mapa final (cada etapa ↔ um campo do projeto)

```text
Projeto protocolado        → projeto_enviado_em (data)
Projeto aprovado           → projeto_aprovado (data)
Pedido de compra           → distribuidor (Fornecedor)
Material entregue          → local_entrega (TLS Solar / Cliente)
Aguardando instalação      → numero_fila (NOVO campo)
Instalação agendada        → data_agendamento (NOVO campo)
Instalação finalizada      → data_instalacao
Conectar logger no WiFi    → wifi_nome / wifi_senha
Criar planta               → nome_planta
```

Etapas sem dado associado (ex.: "Documentação recebida", "Explicar funcionamento") continuam apenas com o check + data/usuário, como já é.

## O que muda na prática

1. **Acompanhamento preenche os campos antigos.** Ao marcar "Projeto protocolado" / "Projeto aprovado", grava a data no campo do projeto (e limpa ao desmarcar). Entrega, fila, agendamento, fornecedor, WiFi e planta passam a gravar direto na coluna canônica.
2. **Nº da fila e Data de agendamento ganham campo fixo** no projeto — passam a aparecer também na edição e no "Ver dados", sem mais ficar só no Acompanhamento.
3. **Fim da duplicação.** Fornecedor, WiFi e Nome da planta deixam de ser gravados em dois lugares; passa a existir um só valor.
4. **Editores alinhados.** "Editar Projeto" (Aguardando) e "Editar Cliente" (Instalados) ficam com o mesmo conjunto de campos (incluindo Nº fila, Data agendada e Local de entrega), deixando claro que "Distribuidor" e "Fornecedor" são o mesmo dado.
5. **Dados atuais preservados.** Tudo que já está em `campo_extra` (e as datas das etapas de homologação já concluídas) é copiado para as colunas canônicas na migração — nada some.

---

## Detalhes técnicos

**Schema (migração)**
- Adicionar a `projetos`: `numero_fila` (integer) e `data_agendamento` (date).
- Backfill a partir do existente:
  - `numero_fila` ← `campo_extra->numero_fila` (fluxo 3, etapa 1).
  - `data_agendamento` ← `campo_extra->data_agendamento` (fluxo 3, etapa 2).
  - `local_entrega` ← `campo_extra->local_entrega` (fluxo 2, etapa 4) quando vazio.
  - `distribuidor` ← `campo_extra->fornecedor` (fluxo 2, etapa 1) quando vazio.
  - `projeto_enviado_em` ← `data_conclusao` da etapa 1.2 concluída quando vazio.
  - `projeto_aprovado` ← `data_conclusao` da etapa 1.3 concluída quando vazio.

**`src/lib/rastreamentoEtapas.ts`**
- Acrescentar a cada `EtapaDef` que tenha dado um `campoProjeto` (nome da coluna canônica) e o tipo (`date`/`text`/`int`/`local`).
- Helper `setCanonico(projetoId, etapa, valor)` e leitura canônica para a UI usar.

**`ListaAcompanhamento.tsx`**
- No `commitCheck`: para etapas só-data (protocolado, aprovado), gravar/limpar a coluna canônica conforme marca/desmarca.
- Mini-modais (fornecedor, WiFi, planta, entrega, fila, agendamento) passam a ler/gravar a coluna canônica; remover a escrita redundante em `campo_extra` (mantendo apenas `campo_extra.ativada` da troca do fluxo 1).
- A lista carrega `numero_fila`, `data_agendamento`, `local_entrega` do projeto e exibe a partir deles (com fallback de leitura do `campo_extra` legado para registros antigos que ainda não passaram pelo backfill).

**`ProjetoForm.tsx` e `ClienteEditModal.tsx`**
- Igualar o conjunto de campos: adicionar Nº da fila, Data de agendamento e seletor de Local de entrega onde faltar; garantir `dia_leitura`, `estrutura`, `cabo_usado`, WiFi, nome da planta nos dois.
- Confirmar que ambos salvam em `distribuidor` (rótulo "Fornecedor/Distribuidor").

**`ClienteDadosModal.tsx`**
- Ler tudo das colunas canônicas (Nº fila, agendamento, entrega, fornecedor, WiFi, planta, datas de homologação); manter `extraDe()` apenas como fallback legado.

Sem novas tabelas; apenas duas colunas novas e realinhamento das telas para uma fonte única de verdade.