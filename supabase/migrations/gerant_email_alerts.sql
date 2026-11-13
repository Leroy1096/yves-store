-- Alertes e-mail au gérant : nouvelle commande, annulation, demande client, nouvelle inscription.
-- La base appelle la fonction Edge notify-gerant via pg_net (asynchrone, après validation de la transaction).
-- Le secret partagé est lu dans Supabase Vault (jamais écrit dans ce fichier).
create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.notify_gerant(p_kind text, p_ref text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_webhook_secret' limit 1;
  if v_secret is null then return; end if;
  perform net.http_post(
    url := 'https://zgxsjvqepjwuzhyskeve.supabase.co/functions/v1/notify-gerant',
    body := jsonb_build_object('kind', p_kind, 'ref', p_ref),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 10000
  );
exception when others then
  -- Une alerte ne doit JAMAIS bloquer une commande ou une inscription
  raise warning 'notify_gerant(%): %', p_kind, sqlerrm;
end $$;
revoke all on function private.notify_gerant(text, text) from public, anon, authenticated;

create or replace function private.tg_orders_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify_gerant('order_new', new.id);
  elsif new.status = 'annulee' and old.status is distinct from 'annulee' then
    perform private.notify_gerant('order_cancel', new.id);
  end if;
  return null;
end $$;

create or replace function private.tg_whatsapp_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_gerant('wa_request', new.id::text);
  return null;
end $$;

create or replace function private.tg_profiles_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_gerant('signup', new.id::text);
  return null;
end $$;

drop trigger if exists orders_notify_gerant on public.orders;
create trigger orders_notify_gerant after insert or update of status on public.orders
  for each row execute function private.tg_orders_notify();

drop trigger if exists whatsapp_notify_gerant on public.whatsapp_requests;
create trigger whatsapp_notify_gerant after insert on public.whatsapp_requests
  for each row execute function private.tg_whatsapp_notify();

drop trigger if exists profiles_notify_gerant on public.profiles;
create trigger profiles_notify_gerant after insert on public.profiles
  for each row execute function private.tg_profiles_notify();
