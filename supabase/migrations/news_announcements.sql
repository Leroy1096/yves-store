-- 18 · Nouveautés : abonnés (site + clients inscrits), annonces produit et résumé de la semaine
-- E-mail : fonction announce-news (Resend) · WhatsApp : envoi 1 clic par le gérant (wa.me)

-- ── Abonnés sans compte (formulaire en bas du site) ──
create table if not exists public.news_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  name text,
  token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint news_subscribers_contact check (email is not null or phone is not null)
);
alter table public.news_subscribers enable row level security;
drop policy if exists news_subscribers_admin_read on public.news_subscribers;
create policy news_subscribers_admin_read on public.news_subscribers for select to authenticated using (public.is_admin());

-- Lien de désabonnement des clients inscrits
alter table public.profiles add column if not exists news_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_news_token_key on public.profiles (news_token);

-- ── Annonces ──
create table if not exists public.announcements (
  id bigserial primary key,
  kind text not null check (kind in ('produit', 'hebdo')),
  product_ids text[] not null default '{}',
  title text not null,
  message text not null,
  status text not null default 'publiee' check (status in ('brouillon', 'publiee')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  email_status text not null default 'a_envoyer' check (email_status in ('a_envoyer', 'envoye', 'test', 'aucun', 'erreur')),
  email_count int not null default 0,
  email_error text,
  wa_sent text[] not null default '{}'
);
alter table public.announcements enable row level security;
drop policy if exists announcements_admin_read on public.announcements;
create policy announcements_admin_read on public.announcements for select to authenticated using (public.is_admin());

-- ── S’abonner (visiteurs) : e-mail et/ou numéro WhatsApp ──
create or replace function public.news_subscribe(p_email text default null, p_phone text default null, p_name text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
        v_phone text := public.ci_phone(p_phone);
        v_name text := nullif(left(trim(coalesce(p_name, '')), 60), '');
begin
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'INVALID_EMAIL'; end if;
  if p_phone is not null and trim(p_phone) <> '' and v_phone is null then raise exception 'INVALID_PHONE'; end if;
  if v_email is null and v_phone is null then raise exception 'EMPTY'; end if;
  -- anti-abus : 40 inscriptions max par minute pour tout le site
  if (select count(*) from public.news_subscribers where created_at > now() - interval '1 minute') >= 40 then raise exception 'RATE_LIMIT'; end if;
  if v_email is not null then
    insert into public.news_subscribers (email, name) values (v_email, v_name)
    on conflict (email) do update set unsubscribed_at = null, name = coalesce(excluded.name, news_subscribers.name);
  end if;
  if v_phone is not null then
    insert into public.news_subscribers (phone, name) values (v_phone, v_name)
    on conflict (phone) do update set unsubscribed_at = null, name = coalesce(excluded.name, news_subscribers.name);
  end if;
  return 'ok';
end $$;
revoke all on function public.news_subscribe(text, text, text) from public;
grant execute on function public.news_subscribe(text, text, text) to anon, authenticated;

-- ── Se désabonner (lien dans l’e-mail) ──
create or replace function public.news_unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int := 0; m int := 0;
begin
  update public.news_subscribers set unsubscribed_at = now() where token = p_token and unsubscribed_at is null;
  get diagnostics n = row_count;
  update public.profiles set newsletter = false where news_token = p_token and newsletter;
  get diagnostics m = row_count;
  return (n + m) > 0 or exists (select 1 from public.news_subscribers where token = p_token) or exists (select 1 from public.profiles where news_token = p_token);
end $$;
revoke all on function public.news_unsubscribe(uuid) from public;
grant execute on function public.news_unsubscribe(uuid) to anon, authenticated;

-- ── Liste des abonnés (gérant) ──
create or replace function public.admin_news_audience()
returns table (key text, name text, email text, phone text, source text, since timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return query
  with clients as (
    select 'p:' || p.id::text as key,
           nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') as name,
           nullif(case when u.email like '%@tel.yvesstore.ci' then p.email else u.email end, '')::text as email,
           coalesce(public.ci_phone(p.contact_phone), public.ci_phone(p.phone)) as phone,
           'client'::text as source, p.created_at as since
      from public.profiles p join auth.users u on u.id = p.id
     where p.newsletter and (u.banned_until is null or u.banned_until < now())
       and not exists (select 1 from public.admins a where a.user_id = p.id)
  )
  select * from clients
  union all
  select 's:' || s.id::text, s.name, s.email, s.phone, 'site'::text, s.created_at
    from public.news_subscribers s
   where s.unsubscribed_at is null
     and not exists (select 1 from clients c where (s.email is not null and lower(c.email) = s.email) or (s.phone is not null and c.phone = s.phone))
  order by 6 desc;
end $$;
revoke all on function public.admin_news_audience() from public, anon;
grant execute on function public.admin_news_audience() to authenticated;

-- ── Désabonner sur demande (« STOP » reçu sur WhatsApp) ──
create or replace function public.admin_news_unsubscribe(p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_key like 'p:%' then update public.profiles set newsletter = false where id = substr(p_key, 3)::uuid;
  elsif p_key like 's:%' then update public.news_subscribers set unsubscribed_at = now() where id = substr(p_key, 3)::uuid;
  end if;
end $$;
revoke all on function public.admin_news_unsubscribe(text) from public, anon;
grant execute on function public.admin_news_unsubscribe(text) to authenticated;

-- ── Publier une annonce (ou un brouillon préparé automatiquement) ──
create or replace function public.admin_publish_announcement(p_kind text, p_product_ids text[], p_title text, p_message text, p_draft_id bigint default null)
returns public.announcements language plpgsql security definer set search_path = public as $$
declare r public.announcements;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_kind not in ('produit', 'hebdo') then raise exception 'INVALID_KIND'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) = 0 then raise exception 'NO_PRODUCT'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) > 12 then raise exception 'TOO_MANY'; end if;
  if length(trim(coalesce(p_message, ''))) < 10 or length(p_message) > 3000 then raise exception 'INVALID_MESSAGE'; end if;
  if p_draft_id is not null then
    update public.announcements set product_ids = p_product_ids, title = left(trim(p_title), 140), message = p_message,
           status = 'publiee', published_at = now(), created_by = coalesce(created_by, auth.uid())
     where id = p_draft_id and status = 'brouillon' returning * into r;
  end if;
  if r.id is null then
    insert into public.announcements (kind, product_ids, title, message, status, created_by, published_at)
    values (p_kind, p_product_ids, left(trim(p_title), 140), p_message, 'publiee', auth.uid(), now()) returning * into r;
  end if;
  return r;
end $$;
revoke all on function public.admin_publish_announcement(text, text[], text, text, bigint) from public, anon;
grant execute on function public.admin_publish_announcement(text, text[], text, text, bigint) to authenticated;

-- ── Suivi des envois WhatsApp (case « envoyé ») ──
create or replace function public.admin_mark_announcement_wa(p_id bigint, p_key text, p_sent boolean default true)
returns text[] language plpgsql security definer set search_path = public as $$
declare v text[];
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.announcements
     set wa_sent = case when p_sent then (select array_agg(distinct x) from unnest(array_append(wa_sent, p_key)) x) else array_remove(wa_sent, p_key) end
   where id = p_id returning wa_sent into v;
  return coalesce(v, '{}');
end $$;
revoke all on function public.admin_mark_announcement_wa(bigint, text, boolean) from public, anon;
grant execute on function public.admin_mark_announcement_wa(bigint, text, boolean) to authenticated;

-- ── Résumé de la semaine : préparé chaque lundi à 9 h (heure d’Abidjan = UTC) ──
create extension if not exists pg_cron;
create or replace function private.news_weekly()
returns void language plpgsql security definer set search_path = '' as $$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_webhook_secret' limit 1;
  if v_secret is null then return; end if;
  perform net.http_post(
    url := 'https://zgxsjvqepjwuzhyskeve.supabase.co/functions/v1/announce-news',
    body := jsonb_build_object('action', 'weekly'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 20000
  );
exception when others then raise warning 'news_weekly: %', sqlerrm;
end $$;
revoke all on function private.news_weekly() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'yves-news-weekly';
select cron.schedule('yves-news-weekly', '0 9 * * 1', $$select private.news_weekly()$$);

-- ═════ 19 · news_announcements_items (appliquée séparément) ═════
-- Instantané des articles annoncés (nom, prix, photo, lien) + audience e-mail réservée au serveur
alter table public.announcements add column if not exists items jsonb not null default '[]'::jsonb;
drop function if exists public.admin_publish_announcement(text, text[], text, text, bigint);
create or replace function public.admin_publish_announcement(p_kind text, p_product_ids text[], p_title text, p_message text, p_items jsonb default '[]'::jsonb, p_draft_id bigint default null)
returns public.announcements language plpgsql security definer set search_path = public as $$
declare r public.announcements;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_kind not in ('produit', 'hebdo') then raise exception 'INVALID_KIND'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) = 0 then raise exception 'NO_PRODUCT'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) > 12 then raise exception 'TOO_MANY'; end if;
  if length(trim(coalesce(p_message, ''))) < 10 or length(p_message) > 3000 then raise exception 'INVALID_MESSAGE'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or length(p_items::text) > 20000 then raise exception 'INVALID_ITEMS'; end if;
  if p_draft_id is not null then
    update public.announcements set product_ids = p_product_ids, title = left(trim(p_title), 140), message = p_message, items = coalesce(p_items, '[]'::jsonb),
           status = 'publiee', published_at = now(), created_by = coalesce(created_by, auth.uid())
     where id = p_draft_id and status = 'brouillon' returning * into r;
  end if;
  if r.id is null then
    insert into public.announcements (kind, product_ids, title, message, items, status, created_by, published_at)
    values (p_kind, p_product_ids, left(trim(p_title), 140), p_message, coalesce(p_items, '[]'::jsonb), 'publiee', auth.uid(), now()) returning * into r;
  end if;
  return r;
end $$;
revoke all on function public.admin_publish_announcement(text, text[], text, text, jsonb, bigint) from public, anon;
grant execute on function public.admin_publish_announcement(text, text[], text, text, jsonb, bigint) to authenticated;

-- Abonnés joignables par e-mail (avec lien de désabonnement) — fonction announce-news uniquement
create or replace function public.news_email_audience()
returns table (key text, name text, email text, token uuid)
language sql stable security definer set search_path = public as $$
  with clients as (
    select 'p:' || p.id::text as key, p.first_name as name,
           nullif(case when u.email like '%@tel.yvesstore.ci' then p.email else u.email end, '')::text as email, p.news_token as token
      from public.profiles p join auth.users u on u.id = p.id
     where p.newsletter and (u.banned_until is null or u.banned_until < now())
       and not exists (select 1 from public.admins a where a.user_id = p.id)
  )
  select * from clients where email is not null
  union all
  select 's:' || s.id::text, s.name, s.email, s.token from public.news_subscribers s
   where s.unsubscribed_at is null and s.email is not null
     and not exists (select 1 from clients c where lower(c.email) = s.email)
$$;
revoke all on function public.news_email_audience() from public, anon, authenticated;
grant execute on function public.news_email_audience() to service_role;

-- ═════ 20 · public_announcements : annonces publiées visibles par les clients (cloche 🔔 + Mon compte) ═════
-- Champs publics uniquement (jamais la liste des envois WhatsApp ni les abonnés)
create or replace function public.public_announcements(p_limit int default 20)
returns table (id bigint, kind text, title text, items jsonb, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.kind, a.title, a.items, a.published_at
    from public.announcements a
   where a.status = 'publiee' and a.published_at is not null
   order by a.published_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
revoke all on function public.public_announcements(int) from public;
grant execute on function public.public_announcements(int) to anon, authenticated;
