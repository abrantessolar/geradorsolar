# Self-host do Supabase — saída do Lovable Cloud

Pacote pronto (stack oficial do Supabase, via Docker Compose) pra rodar o
banco/auth/storage/functions do sistema **fora** do Lovable Cloud, numa VPS
própria. O arquivo `README-upstream-supabase.md` nesta pasta é a
documentação original do Supabase — este README aqui é o passo a passo
específico pra migração da Três Lagoas Solar.

## 1. Isso serve pra hospedagem compartilhada da HostGator?

**Não.** Hospedagem compartilhada (cPanel, "hospedagem de site" comum) não
dá acesso root nem roda Docker — é uma limitação da própria plataforma, não
tem jeito de "empacotar menor" pra contornar isso. O que dá pra rodar ali é
só o **front-end** (os arquivos estáticos gerados por `npm run build`) — ver
seção 5.

Pra rodar **este** pacote (banco de dados, login, storage, as funções do
Monitoramento) é preciso uma **VPS/Cloud com acesso root e Docker**. A
própria HostGator vende esse tipo de plano (linha VPS Linux / Cloud),
separado da hospedagem compartilhada — precisa confirmar isso ao contratar.
Qualquer VPS Linux concorrente (ex: a que já estava sendo avaliada pro
IP fixo da GoodWe) também serve — é só uma máquina Linux com Docker, não
precisa ser HostGator necessariamente.

**Especificação mínima recomendada:** 2 vCPU, 4 GB RAM, 60 GB de disco
SSD/NVMe, Ubuntu 22.04+. Dá pra tentar com 2 GB de RAM, mas fica apertado
com Postgres + Auth + Storage + Functions rodando juntos.

## 2. O que esse pacote sobe

Os mesmos serviços que o Lovable Cloud já usa por trás (é literalmente o
mesmo software, self-hosted): Postgres, GoTrue (auth), PostgREST (API),
Storage, Realtime, Edge Functions (Deno), Studio (painel admin) e o
gateway (Kong/Envoy). Como é a mesma API, **o código do site não precisa
ser reescrito** — só aponta pra URL nova.

## 3. Passo a passo de deploy (na VPS, depois de contratada)

```bash
# 1. Instalar Docker + Docker Compose na VPS (Ubuntu)
curl -fsSL https://get.docker.com | sh

# 2. Copiar esta pasta (deploy/selfhost-supabase) pra VPS
#    (via scp, git clone do repo, ou rsync)

# 3. Gerar os segredos (NÃO usar os valores de exemplo do .env.example)
cp .env.example .env
# Gerar POSTGRES_PASSWORD, JWT_SECRET (mín. 32 caracteres), e então
# gerar ANON_KEY/SERVICE_ROLE_KEY assinados com esse JWT_SECRET —
# o próprio Supabase documenta isso em:
# https://supabase.com/docs/guides/self-hosting/docker#securing-your-services
# Preencher também: SITE_URL (domínio final), SUPABASE_PUBLIC_URL,
# SMTP_* (pra emails de reset de senha funcionarem), DASHBOARD_PASSWORD.

# 4. Subir
docker compose up -d

# 5. Conferir que subiu tudo
docker compose ps
```

O Studio (painel admin do Postgres) fica disponível na porta configurada
em `KONG_HTTP_PORT`/`SUPABASE_PUBLIC_URL` — proteger com HTTPS (Caddy/Nginx
na frente, veja `docker-compose.caddy.yml` ou `docker-compose.nginx.yml`)
antes de expor pra internet.

## 4. Migrar os dados do projeto atual (Lovable Cloud → aqui)

Isso **não dá pra fazer a partir deste ambiente** — preciso de acesso
direto ao banco de produção atual (bloqueado daqui pelo proxy de rede,
igual já tinha acontecido na investigação do incidente de 19/10) e à VPS de
destino. É trabalho pra rodar com a CLI do Supabase, de uma máquina com
acesso aos dois lados (sua máquina, ou uma Action do GitHub):

1. **Schema + dados do banco** — `supabase db dump` (schema) e
   `pg_dump --data-only` (dados) do projeto atual, depois `psql` /
   `supabase db push` no banco novo. As 61 migrações já versionadas em
   `supabase/migrations/` deste repo cobrem o schema — a parte que falta
   é só os *dados* (linhas das tabelas).
2. **Usuários/login** — exportar `auth.users` (inclui o hash de senha,
   compatível entre instâncias Supabase — login continua funcionando sem
   pedir redefinição de senha).
3. **Arquivos dos 3 buckets de storage** — `energia-premios`,
   `layouts-obras`, `site-content`. Dá pra copiar com `rclone` (S3-compatible
   em ambas as pontas) ou baixando e re-subindo via API.
4. **Edge functions** — o runtime Deno já vem no pacote
   (`volumes/functions/`); copio o código de `supabase/functions/` deste
   repo pra lá. Precisa recriar os secrets de cada uma
   (`FOXESS_API_KEY`, `SOLIS_KEY_ID`/`SOLIS_KEY_SECRET`, `MON_CRON_SECRET`,
   `GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_SHEETS_ID`) no `.env` da VPS nova.
5. **Trocar o que depende da Lovable de verdade** — a função
   `generate-document` usa `LOVABLE_API_KEY` (gateway de IA da própria
   Lovable). Pra sair de vez, troca por uma chave direta de IA (OpenAI ou
   Anthropic) — é uma mudança pequena de código.
6. **Front-end** — trocar `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`
   no `.env` do build pra apontar pra VPS nova, e gerar um novo build.
7. **Cron da coleta** (`.github/workflows/mon-coleta-cron.yml`) — já roda
   fora do Lovable (GitHub Actions), só precisa trocar a URL de destino e
   o `MON_CRON_SECRET` nos secrets do repositório.

## 5. Front-end (arquivos estáticos) — esse sim dá pra ir pra hospedagem
   comum da HostGator

```bash
npm run build   # gera a pasta dist/
```

A pasta `dist/` é só HTML/CSS/JS — sobe por FTP/File Manager do cPanel
normalmente, sem precisar de VPS. É independente do passo 1-4: pode ficar
na HostGator comum enquanto o banco fica numa VPS (ou até em outro
provedor) — só o `VITE_SUPABASE_URL` no build precisa apontar pro lugar
certo.

## 6. O que passa a ser responsabilidade sua depois da migração

Hoje o Lovable/Supabase cloud cuida disso por trás. Numa VPS própria, isso
vira trabalho contínuo, não um projeto de uma vez só:
- Backup do banco (não tem automático — precisa configurar `pg_dump`
  agendado, igual foi feito pro cron da coleta).
- Atualização de segurança do servidor e das imagens Docker.
- Renovação de certificado HTTPS (automatizável com Caddy/Certbot).
- Monitorar espaço em disco (logs, backups e os 3 buckets crescem com o
  tempo).

Isso não inviabiliza a migração — só é importante entrar sabendo que o
ganho de custo vem junto com essa manutenção, que hoje ninguém da equipe
precisa fazer.
