-- members_main "Strapi Webhook": keep the edge-function bearer key in Vault
-- instead of the trigger arguments.
--
-- Before running, create the Vault secret once (never commit the value):
--   select vault.create_secret('<key>', 'members_main_webhook_service_key',
--     'Bearer key for the members_main Strapi Webhook (hello-world edge function)');
-- To rotate the key later:
--   select vault.update_secret(id, '<new key>')
--   from vault.secrets where name = 'members_main_webhook_service_key';

create or replace function public.members_main_strapi_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_key text;
  request_id bigint;
begin
  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'members_main_webhook_service_key';

  if service_key is null then
    raise exception 'vault secret members_main_webhook_service_key is missing';
  end if;

  -- Same request as supabase_functions.http_request (Database Webhook) sent.
  select net.http_post(
    url := tg_argv[0],
    body := jsonb_build_object(
      'old_record', old,
      'record', new,
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    timeout_milliseconds := tg_argv[1]::integer
  ) into request_id;

  insert into supabase_functions.hooks (hook_table_id, hook_name, request_id)
  values (tg_relid, tg_name, request_id);

  return new;
end
$$;

revoke all on function public.members_main_strapi_webhook() from public, anon, authenticated;

drop trigger if exists "Strapi Webhook" on public.members_main;
create trigger "Strapi Webhook"
after insert or update or delete on public.members_main
for each row execute function public.members_main_strapi_webhook(
  'https://wqhsaarqvvbyhsegpybr.supabase.co/functions/v1/hello-world',
  '5000'
);
