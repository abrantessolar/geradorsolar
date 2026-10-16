-- Central de Monitoramento TLS — agenda a coleta FoxESS via pg_cron.
--
-- Primeira vez que pg_cron é usado neste projeto (não havia nenhum
-- agendamento no banco antes — todas as edge functions existentes eram
-- só on-demand via HTTP do front).
--
-- ⚠️ PASSO MANUAL ÚNICO, fora do versionamento (não commitar a chave em
-- migração nenhuma): antes desta migração rodar em produção, cadastre a
-- service role key no Vault pelo SQL Editor do Supabase:
--
--   select vault.create_secret('<SERVICE_ROLE_KEY_AQUI>', 'mon_service_role_key');
--
-- Esta migração só referencia o NOME do segredo (`mon_service_role_key`),
-- nunca o valor — o valor fica só no Vault, criptografado.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'mon-coleta-foxess',
  '*/20 * * * *', -- a cada 20 minutos
  $$
  select net.http_post(
    url := 'https://jvlreltjfubennbtjvyq.supabase.co/functions/v1/mon-coleta',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'mon_service_role_key'
      )
    ),
    body := jsonb_build_object('origem', 'pg_cron')
  ) as request_id;
  $$
);
