# Sistema de Rastreamento de Obra

Painel Kanban interno (aba em Clientes) + página pública de acompanhamento para o cliente, com avaliação pós-instalação e reaproveitamento do programa "Energia que Volta" para indicação.

## Decisões confirmadas
- **Indicação**: reaproveita o programa existente (botão leva para `/energia`). Não cria tabela `indicacoes` nem rota `/indicacao/[codigo]`.
- **Kanban**: 4 colunas macro — Homologação, Equipamentos, Instalação, Concluído.
- **Local**: nova aba "Acompanhamento" dentro da página Clientes.
- **Escopo**: todos os projetos ativos aparecem no Kanban; o link é gerado sob demanda.

## Banco de dados (migration)

**`rastreamento_obras`** (uma linha por etapa de cada projeto):
- `projeto_id` (uuid), `fluxo` (int 1-3), `etapa` (int), `concluido` (bool, default false)
- `data_conclusao` (timestamptz, null), `visivel_cliente` (bool, default true)
- `observacao_interna` (text, null), `campo_extra` (jsonb, null) — para `local_entrega`, `numero_fila`, `data_agendamento`, `data_operacao`, e a flag da etapa condicional "aprovado com troca"
- timestamps padrão + trigger `atualizado_em`
- Índice em `projeto_id` e em `fluxo,etapa`.

**`projetos`**: adicionar coluna `codigo_rastreamento` (text, unique, null) — gerada ao clicar em "Gerar link".

**`avaliacoes_clientes`**:
- `projeto_id` (uuid), `nota` (int 1-5), `comentario` (text, null), timestamps.

**RLS / GRANTs**:
- `rastreamento_obras` e `avaliacoes_clientes`: acesso de escrita/leitura para `authenticated` (equipe logada). `service_role` ALL (usado pela edge function pública). Sem acesso direto de `anon` — a página pública passa pela edge function.

## Acesso público (edge function `rastreamento`)
Função pública (verify_jwt=false, service role) — mesmo padrão da função `energia`:
- `get(codigo)` → retorna nome do cliente, etapas visíveis (apenas `visivel_cliente=true`), campos extras (fila, datas, local entrega), status de "sistema em operação" e se já existe avaliação.
- `avaliar(codigo, nota, comentario)` → insere em `avaliacoes_clientes`.
- `config()` → devolve link Google e texto do programa de indicação (lidos de `configuracoes`).

Mantém a tabela `projetos` privada; o cliente só enxerga o mínimo necessário.

## Rota pública `/acompanhar/:codigo`
Nova página `src/pages/RastreamentoPage.tsx` (registrada em `App.tsx` envolta em `<div>` com `<SeoNoIndex/>`, seguindo o padrão de `/proposta/:id`).

Layout:
- Header: logo TLS, "Olá, [nome]! 👋" e subtítulo.
- 3 timelines verticais (Homologação 📄 / Equipamentos 📦 / Instalação ⚡), cada etapa com status visual: ✅ concluído (verde), ⏳ em andamento (amarelo+spinner), 🔒 pendente (cinza). Só etapas `visivel_cliente`.
- Campos especiais exibidos: local de entrega (Fluxo 2/4), posição na fila (Fluxo 3/1), data agendada (3/2), data de operação (3/4).
- **Seção pós-instalação** (aparece após "Sistema em operação"):
  - 5 estrelas clicáveis → grava avaliação.
  - Nota 5: card verde + botão "Avaliar no Google ↗" (link do admin).
  - Nota < 5: campo de texto "O que poderíamos ter feito melhor?" → grava comentário.
  - Card "Conheça nosso programa de indicação" com texto configurável + botão "Quero indicar um amigo" → leva para `/energia`, e botão compartilhar no WhatsApp.

Etapas fixas dos 3 fluxos (constante compartilhada `src/lib/rastreamentoEtapas.ts`):
```text
Fluxo 1 Homologação: Documentação recebida | Projeto protocolado | Projeto aprovado | Aprovado com troca (condicional)
Fluxo 2 Equipamentos: Pedido de compra | Equipamento pago | Em transporte | Material entregue (+local)
Fluxo 3 Instalação:  Aguardando instalação (+fila) | Instalação agendada (+data) | Instalação finalizada | Sistema em operação (+data)
```

## Kanban interno (aba "Acompanhamento" em Clientes)
- `ClientesPage.tsx`: adicionar terceira `TabsTrigger` "Acompanhamento".
- Novo `src/components/gestor/acompanhamento/KanbanAcompanhamento.tsx`:
  - 4 colunas (Homologação, Equipamentos, Instalação, Concluído). A coluna de cada projeto é derivada do progresso das etapas (último fluxo com etapa concluída; "Concluído" quando Sistema em operação concluído).
  - Cards: nome, número da proposta, instalador, dias na etapa atual, selo de atraso (> prazo configurado).
  - Drag-and-drop entre colunas usando HTML5 nativo (mesmo estilo do `useDraggableColumns` já no projeto; sem nova dependência). Mover um card marca/desmarca as etapas-chave correspondentes.
- Painel lateral (Sheet) por cliente: lista os 3 fluxos com, por etapa:
  - toggle ✅ Concluído / ⏳ Pendente (+ data automática na conclusão)
  - toggle 👁 Visível / 🔒 Oculto
  - campo de observação interna
  - campos especiais (radio local de entrega, número da fila, datas com date picker)
  - toggle para ativar a etapa condicional "Aprovado com troca"
  - Ao concluir uma etapa visível: prompt "Notificar cliente via WhatsApp?" → abre `wa.me` com mensagem pré-formatada e o link.
- Seeding: ao abrir o painel/gerar link, se o projeto não tiver linhas em `rastreamento_obras`, criar as etapas padrão.

## Geração do link (ficha do projeto)
- Em `ProjetosUnificados.tsx` (ações do projeto aguardando), adicionar ação "🔗 Gerar link de rastreamento":
  - gera `codigo_rastreamento` (ex.: `TLS-XXXX-ABC`) se ainda não existir e grava em `projetos`.
  - mostra o link, botão "Copiar" e "Enviar por WhatsApp" com a mensagem pré-formatada.

## Configurações no Admin (aba Empresa)
Em `CompanyTab` (AdminPage), nova seção salvando em `configuracoes` (via `getConfigDB`/`saveConfigDB`):
- Link do Google Meu Negócio (avaliações).
- Texto do programa de indicação.
- Prazo máximo (dias) por macro-etapa antes de marcar "atrasado" no Kanban.

## Detalhes técnicos
- Datas BR via `fmtDateBR`; date pickers shadcn com `pointer-events-auto`.
- WhatsApp via links `wa.me` (sem backend), padrão do `WhatsAppLink`.
- Notificações ao admin de nota baixa: toast/realtime opcional reaproveitando o padrão de `LeadNotification` (escuta inserts em `avaliacoes_clientes` com nota < 5).
- Cores semânticas do tema (verde/amarelo) — sem cores hardcoded.

## Arquivos
- Migration: `rastreamento_obras`, `avaliacoes_clientes`, coluna `codigo_rastreamento`, RLS/GRANTs.
- Edge function: `supabase/functions/rastreamento/index.ts`.
- Novos: `src/pages/RastreamentoPage.tsx`, `src/lib/rastreamentoEtapas.ts`, `src/components/gestor/acompanhamento/KanbanAcompanhamento.tsx`, painel lateral de etapas, modal de gerar link.
- Editados: `src/App.tsx`, `src/pages/ClientesPage.tsx`, `src/components/gestor/ProjetosUnificados.tsx`, `src/pages/AdminPage.tsx` (CompanyTab).
