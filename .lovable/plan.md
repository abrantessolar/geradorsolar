## Módulo "Energia que Volta" — Plataforma de Indicação Gamificada

Plataforma independente integrada ao site da Três Lagoas Solar, com trilha gamificada temática solar, login de cliente por CPF + data de nascimento (sem sessão persistente), e painel admin separado.

### 1. Acesso e Rotas

- **Botão na landing page** (topo, ao lado de "Área do Consultor"): "Energia que Volta"
- **`/energia`** — Login do cliente (CPF + data nasc.)
- **`/energia/dashboard`**, `/energia/trilha`, `/energia/premios`, `/energia/indicacoes`, `/energia/ranking` — telas do cliente (sem sessão persistente; CPF+nasc validado a cada visita; após login guarda apenas o `indicador_id` em memória React durante a navegação — ao recarregar pede login novamente)
- **`/energia/admin`** — Login admin separado (usuário/senha próprios, tabela própria, hash bcrypt em edge function)
- **`/energia/admin/...`** — Painel admin (visão geral, prêmios, trilha, pontuação, clientes, indicações, resgates, configurações)
- **`/energia/i/:codigo`** — Link público de indicação (capta lead, registra indicação como "enviada", redireciona para landing)
- Rotas adicionadas em `src/App.tsx`, com `<SeoNoIndex />` nas internas

### 2. Banco de Dados (novas tabelas)

```text
energia_admins              (id, usuario, senha_hash, nome, ativo, criado_em)
energia_indicadores         (id, nome, cpf, data_nascimento, telefone, email,
                             codigo_link UNIQUE, pontos_acumulados, etapa_atual,
                             aparece_ranking BOOL, ultimo_acesso, criado_em)
energia_premios             (id, nome, imagem_url, pontos_necessarios, ordem,
                             ativo, criado_em)
energia_etapas              (id, nome, ordem, pontos_minimos, premio_id, icone)
energia_indicacoes          (id, indicador_id, nome_indicado, telefone_indicado,
                             valor_negocio, status [enviada|negociacao|fechada],
                             pontos_creditados, criado_em, fechada_em, observacao)
energia_resgates            (id, indicador_id, premio_id, pontos_utilizados,
                             status [pendente|entregue], solicitado_em, entregue_em)
energia_pontos_log          (id, indicador_id, pontos, motivo, admin_id, criado_em)
energia_campanhas           (id, nome, inicio, fim, multiplicador, ativa)
energia_config              (chave UNIQUE, valor JSONB)
   -- chaves: pontos_padrao_indicacao, bonus_valor_minimo, bonus_pontos,
   --        webhook_kommo_url, mensagem_resgate, texto_link_indicacao,
   --        logo_url, nome_plataforma
```

**RLS**: tabelas restritas; acesso público apenas via edge functions (que validam CPF/data ou token admin). Sem acesso direto do client anon.

### 3. Edge Functions (lógica server-side)

Como não há sessão Supabase, toda interação client/admin passa por edge functions com validação:

- `ev-login-cliente` — recebe CPF+data, valida em `energia_indicadores`, retorna `indicador_id` + dados básicos
- `ev-login-admin` — usuário+senha, bcrypt compare, retorna token JWT simples (assinado com secret) válido 8h
- `ev-cliente-data` — recebe `indicador_id`+CPF (revalida), retorna dashboard, trilha, prêmios, indicações, ranking
- `ev-cliente-resgatar` — valida pontos, cria resgate pendente
- `ev-captar-indicacao` — recebe `codigo_link` + dados do indicado (público), cria indicação status "enviada"
- `ev-admin-*` — CRUD de prêmios, etapas, pontuação, clientes, indicações, resgates, config (valida token admin)
- `ev-fechar-indicacao` — ao mudar status para "fechada": calcula pontos (base × multiplicador campanha + bônus), credita ao indicador, recalcula etapa, dispara webhook Kommo

Secret necessário: `EV_ADMIN_JWT_SECRET` (será solicitado via add_secret).

### 4. Telas do Cliente

```text
src/pages/energia/
  LoginPage.tsx              CPF mask + data nascimento
  DashboardPage.tsx          Saudação, 3 gauges (recharts RadialBar),
                             trilha horizontal, card próximo prêmio,
                             botão "Indicar agora" (modal com link + WhatsApp)
  TrilhaPage.tsx             Visão expandida das casas (Raio→Sol Maior)
  PremiosPage.tsx            Grid catálogo + histórico resgates
  IndicacoesPage.tsx         Lista cronológica com badges de status
  RankingPage.tsx            Top 10 + posição do cliente
  components/
    EnergiaLayout.tsx        Bottom nav (4 ícones) + header
    Trilha.tsx               SVG/divs com casas iluminadas/cadeado/pulsando
    GaugeIndicator.tsx       Velocímetro (recharts)
    PremioCard.tsx
```

Visual: paleta solar (#F5A623, #E8651A, #1A3C5E, #FFFFFF), flat lúdico, animações `animate-pulse` na casa atual.

### 5. Telas do Admin

```text
src/pages/energia/admin/
  LoginPage.tsx
  AdminLayout.tsx            Sidebar com 8 itens
  VisaoGeralPage.tsx         Cards + gráfico mensal (recharts)
  PremiosPage.tsx            CRUD + upload PNG (bucket novo: energia-premios)
  TrilhaPage.tsx             Editar etapas, drag-reorder (dnd-kit)
  PontuacaoPage.tsx          Valor padrão, regra bônus, campanhas
  ClientesPage.tsx           Lista + busca + adicionar pontos manual + toggle ranking
  IndicacoesPage.tsx         Lista + alterar status (dispara fechamento)
  ResgatesPage.tsx           Pendentes + confirmar entrega + histórico
  ConfiguracoesPage.tsx      Webhook Kommo, mensagens, logo, nome
```

Auth admin: token guardado em `sessionStorage` (expira ao fechar aba), enviado em todas as chamadas como header `x-ev-admin-token`.

### 6. Lógica de Pontuação e Etapas

- Ao fechar indicação: `pontos = pontos_padrao × multiplicador_campanha_ativa + (valor_negocio >= bonus_valor_minimo ? bonus_pontos : 0)`
- Recalcula `etapa_atual` consultando `energia_etapas` ordenadas por `pontos_minimos` (a maior etapa cujo `pontos_minimos <= pontos_acumulados`)
- Resgate: `pontos_utilizados` é debitado de `pontos_acumulados`

### 7. Integração com Site Atual

- Botão "Energia que Volta" no header da `LandingPage.tsx`, ao lado do botão Área do Consultor
- Bucket público novo: `energia-premios` (imagens PNG dos prêmios)
- `mem://features/energia-que-volta` será criado documentando o módulo
- Não toca em nenhum módulo existente (gestor, calculadora, admin atual)

### 8. Etapas de Implementação

1. Criar migração com 9 tabelas + RLS + bucket
2. Solicitar secret `EV_ADMIN_JWT_SECRET` e seed do primeiro admin
3. Edge functions de login (cliente + admin)
4. Edge functions de dados (cliente)
5. Telas do cliente (login → dashboard → demais)
6. Edge functions admin
7. Telas admin
8. Edge function `ev-fechar-indicacao` com webhook Kommo
9. Botão na landing page + rotas em App.tsx
10. Salvar memória do módulo

### Observações

- **Sem sessão persistente do cliente** (conforme escolhido): cada acesso pede CPF+nasc. O link `/energia/i/:codigo` não exige login para o indicado preencher dados.
- **Indicadores são cadastrados pelo admin** (importação manual ou criação) — não há autoinscrição.
- **Webhook Kommo**: URL configurável em `energia_config`; payload JSON com `{indicador, indicado, pontos, valor}`.
