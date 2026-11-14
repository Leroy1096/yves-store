-- 21 · Avis clients, badge « Nouveau prix », options de prix (perruques : longueur / qualité), journal des actions de l'IA

-- ═════════════ Avis clients ═════════════
create table if not exists public.product_reviews (
  id bigserial primary key,
  product_id text not null references public.catalog_products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 80),
  comment text not null check (char_length(comment) between 10 and 1000),
  status text not null default 'publie' check (status in ('publie', 'masque')),
  reply text check (char_length(reply) <= 600),
  replied_at timestamptz,
  seen_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists product_reviews_product_idx on public.product_reviews (product_id, status);
alter table public.product_reviews enable row level security;
drop policy if exists product_reviews_admin_read on public.product_reviews;
create policy product_reviews_admin_read on public.product_reviews for select to authenticated using (public.is_admin());
drop policy if exists product_reviews_own_read on public.product_reviews;
create policy product_reviews_own_read on public.product_reviews for select to authenticated using (user_id = auth.uid());

-- Achat vérifié : commande non annulée contenant l'article
create or replace function private.review_verified(p_user uuid, p_product text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders o where o.user_id = p_user and o.status <> 'annulee'
                  and o.lines @> jsonb_build_array(jsonb_build_object('id', p_product)))
$$;

-- Avis publiés d'un article (prénom + initiale uniquement)
create or replace function public.public_product_reviews(p_product text)
returns table (id bigint, author text, city text, rating smallint, title text, comment text, verified boolean, reply text, replied_at timestamptz, created_at timestamptz, mine boolean, hidden boolean)
language sql stable security definer set search_path = public as $$
  select r.id, coalesce(public.short_name(r.user_id), 'Client'), p.city, r.rating, r.title, r.comment,
         private.review_verified(r.user_id, r.product_id), r.reply, r.replied_at, r.created_at,
         r.user_id = auth.uid(), r.status = 'masque'
    from public.product_reviews r left join public.profiles p on p.id = r.user_id
   where r.product_id = p_product and (r.status = 'publie' or r.user_id = auth.uid())
   order by (r.user_id = auth.uid()) desc, r.created_at desc
   limit 200
$$;
revoke all on function public.public_product_reviews(text) from public;
grant execute on function public.public_product_reviews(text) to anon, authenticated;

-- Note moyenne et nombre d'avis par article (cartes produits, tri « mieux notés »)
create or replace function public.product_review_stats()
returns table (product_id text, avg_rating numeric, review_count int, dist int[])
language sql stable security definer set search_path = public as $$
  select r.product_id, round(avg(r.rating)::numeric, 1), count(*)::int,
         array[count(*) filter (where rating = 5), count(*) filter (where rating = 4), count(*) filter (where rating = 3), count(*) filter (where rating = 2), count(*) filter (where rating = 1)]::int[]
    from public.product_reviews r where r.status = 'publie' group by r.product_id
$$;
revoke all on function public.product_review_stats() from public;
grant execute on function public.product_review_stats() to anon, authenticated;

-- Publier / modifier son avis (clients connectés)
create or replace function public.submit_review(p_product text, p_rating int, p_title text, p_comment text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_title text := nullif(left(btrim(coalesce(p_title, '')), 80), ''); v_comment text := btrim(coalesce(p_comment, ''));
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if public.is_admin() then raise exception 'ADMIN_CANNOT_REVIEW'; end if;
  if not exists (select 1 from public.catalog_products where id = p_product and active) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  if char_length(v_comment) < 10 or char_length(v_comment) > 1000 then raise exception 'INVALID_COMMENT'; end if;
  if (select count(*) from public.product_reviews where user_id = auth.uid() and updated_at > now() - interval '1 day') >= 15 then raise exception 'RATE_LIMIT'; end if;
  insert into public.product_reviews (product_id, user_id, rating, title, comment)
  values (p_product, auth.uid(), p_rating, v_title, v_comment)
  on conflict (product_id, user_id) do update
     set rating = excluded.rating, title = excluded.title, comment = excluded.comment, updated_at = now(), seen_by_admin = false
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_review(text, int, text, text) from public, anon;
grant execute on function public.submit_review(text, int, text, text) to authenticated;

create or replace function public.delete_my_review(p_product text)
returns void language sql security definer set search_path = public as $$
  delete from public.product_reviews where product_id = p_product and user_id = auth.uid()
$$;
revoke all on function public.delete_my_review(text) from public, anon;
grant execute on function public.delete_my_review(text) to authenticated;

-- Gérant : liste, masquer / republier, répondre
create or replace function public.admin_list_reviews()
returns table (id bigint, product_id text, product_name text, author text, rating smallint, title text, comment text, status text, reply text, replied_at timestamptz, created_at timestamptz, seen boolean, verified boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return query
  select r.id, r.product_id, c.name, coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), 'Client'),
         r.rating, r.title, r.comment, r.status, r.reply, r.replied_at, r.created_at, r.seen_by_admin, private.review_verified(r.user_id, r.product_id)
    from public.product_reviews r join public.catalog_products c on c.id = r.product_id left join public.profiles p on p.id = r.user_id
   order by r.created_at desc limit 500;
end $$;
revoke all on function public.admin_list_reviews() from public, anon;
grant execute on function public.admin_list_reviews() to authenticated;

create or replace function public.admin_review_action(p_id bigint, p_status text default null, p_reply text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('publie', 'masque') then raise exception 'INVALID_STATUS'; end if;
  update public.product_reviews
     set status = coalesce(p_status, status),
         reply = case when p_reply is null then reply else nullif(left(btrim(p_reply), 600), '') end,
         replied_at = case when p_reply is null then replied_at when btrim(p_reply) = '' then null else now() end,
         seen_by_admin = true
   where id = p_id;
end $$;
revoke all on function public.admin_review_action(bigint, text, text) from public, anon;
grant execute on function public.admin_review_action(bigint, text, text) to authenticated;

create or replace function public.admin_mark_reviews_seen()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.product_reviews set seen_by_admin = true where not seen_by_admin;
end $$;
revoke all on function public.admin_mark_reviews_seen() from public, anon;
grant execute on function public.admin_mark_reviews_seen() to authenticated;

-- E-mail au gérant à chaque nouvel avis
create or replace function private.tg_reviews_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_gerant('review_new', new.id::text);
  return null;
end $$;
drop trigger if exists reviews_notify_gerant on public.product_reviews;
create trigger reviews_notify_gerant after insert on public.product_reviews
  for each row execute function private.tg_reviews_notify();

-- ═════════════ Badge « Nouveau prix » ═════════════
alter table public.catalog_products add column if not exists previous_price int, add column if not exists price_changed_at timestamptz;
create or replace function public.admin_update_product(p_id text, p_price integer, p_compare_at integer, p_active boolean, p_low integer default null)
returns public.catalog_products language plpgsql security definer set search_path = public as $$
declare r public.catalog_products; v_old int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_price is null or p_price < 100 or p_price > 10000000 then raise exception 'Prix invalide'; end if;
  if p_compare_at is not null and p_compare_at <= p_price then raise exception 'Le prix barré doit être supérieur au prix de vente'; end if;
  select price into v_old from public.catalog_products where id = p_id for update;
  if not found then raise exception 'Produit introuvable'; end if;
  update public.catalog_products set price = p_price, compare_at = p_compare_at, active = coalesce(p_active, active),
    low_stock_threshold = coalesce(p_low, low_stock_threshold), updated_at = now(),
    -- Baisse de prix → badge « Nouveau prix » (14 jours) ; hausse → badge retiré
    previous_price = case when p_price < v_old then greatest(v_old, coalesce(case when price_changed_at > now() - interval '14 days' then previous_price end, 0))
                          when p_price > v_old then null else previous_price end,
    price_changed_at = case when p_price < v_old then now() when p_price > v_old then null else price_changed_at end
   where id = p_id returning * into r;
  return r;
end $$;

-- ═════════════ Options de prix (ex. perruques : longueur, qualité) ═════════════
alter table public.catalog_products add column if not exists price_options jsonb;
create or replace function public.admin_set_price_options(p_id text, p_options jsonb)
returns public.catalog_products language plpgsql security definer set search_path = public as $$
declare r public.catalog_products; g jsonb; c jsonb; v_price int; v_labels text[];
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select price into v_price from public.catalog_products where id = p_id;
  if not found then raise exception 'Produit introuvable'; end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) = 0 then
    update public.catalog_products set price_options = null, updated_at = now() where id = p_id returning * into r; return r;
  end if;
  if jsonb_array_length(p_options) > 3 then raise exception 'Maximum 3 options (ex. Longueur, Qualité, Couleur)'; end if;
  for g in select * from jsonb_array_elements(p_options) loop
    if char_length(btrim(coalesce(g->>'group', ''))) not between 1 and 30 then raise exception 'Nom d’option invalide'; end if;
    if jsonb_typeof(g->'choices') <> 'array' or jsonb_array_length(g->'choices') not between 2 and 12 then raise exception 'Chaque option doit avoir entre 2 et 12 choix (« % »)', g->>'group'; end if;
    v_labels := '{}';
    for c in select * from jsonb_array_elements(g->'choices') loop
      if char_length(btrim(coalesce(c->>'label', ''))) not between 1 and 30 then raise exception 'Choix invalide dans « % »', g->>'group'; end if;
      if btrim(c->>'label') = any (v_labels) then raise exception 'Choix en double dans « % »', g->>'group'; end if;
      v_labels := v_labels || btrim(c->>'label');
      if jsonb_typeof(c->'delta') <> 'number' or (c->>'delta')::numeric <> round((c->>'delta')::numeric) or (c->>'delta')::int > 1000000 or v_price + (c->>'delta')::int < 100 then
        raise exception 'Supplément invalide pour « % »', c->>'label';
      end if;
    end loop;
  end loop;
  update public.catalog_products set price_options = (
      select jsonb_agg(jsonb_build_object('group', btrim(x->>'group'),
               'choices', (select jsonb_agg(jsonb_build_object('label', btrim(y->>'label'), 'delta', (y->>'delta')::int)) from jsonb_array_elements(x->'choices') y)))
        from jsonb_array_elements(p_options) x), updated_at = now()
   where id = p_id returning * into r;
  return r;
end $$;
revoke all on function public.admin_set_price_options(text, jsonb) from public, anon;
grant execute on function public.admin_set_price_options(text, jsonb) to authenticated;

-- Commandes : prix des options recalculé par le serveur
create or replace function public.orders_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l jsonb; p record; v_qty int; v_img text; g jsonb; c jsonb; v_pick text; v_opts jsonb; v_delta int; v_found boolean;
  v_lines jsonb := '[]'::jsonb; v_sub int := 0; v_disc int := 0; v_ship int := 0; v_code text;
  v_need record;
begin
  new.created_at := now();
  new.status := 'confirmee';
  new.cancelled_at := null;
  new.cancel_reason := null;

  if new.shipping not in ('abidjan', 'interieur', 'retrait') then
    raise exception 'INVALID_SHIPPING' using errcode = 'P0001';
  end if;
  if jsonb_typeof(new.lines) <> 'array' or jsonb_array_length(new.lines) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;

  -- Prix, nom, options et disponibilité relus dans le catalogue (jamais ceux du navigateur)
  for l in select * from jsonb_array_elements(new.lines) loop
    begin v_qty := (l->>'qty')::int; exception when others then v_qty := null; end;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'INVALID_QTY' using errcode = 'P0001';
    end if;
    select id, name, price, active, stock, images, price_options into p
      from public.catalog_products where id = l->>'id' for update;
    if not found or not p.active then
      raise exception 'PRODUCT_UNAVAILABLE|%', coalesce(p.name, l->>'name', l->>'id') using errcode = 'P0001';
    end if;
    v_opts := null; v_delta := 0;
    if p.price_options is not null and jsonb_typeof(p.price_options) = 'array' then
      v_opts := '{}'::jsonb;
      for g in select * from jsonb_array_elements(p.price_options) loop
        v_pick := l->'options'->>(g->>'group'); v_found := false;
        for c in select * from jsonb_array_elements(g->'choices') loop
          if c->>'label' = v_pick then v_found := true; v_delta := v_delta + (c->>'delta')::int; v_opts := v_opts || jsonb_build_object(g->>'group', c->>'label'); end if;
        end loop;
        if not v_found then
          raise exception 'OPTION_REQUIRED|%|%', p.name, g->>'group' using errcode = 'P0001';
        end if;
      end loop;
    end if;
    v_img := coalesce(p.images[1], l->>'image');
    if v_img is not null and (char_length(v_img) > 500 or not (v_img ~ '^(https://|/|\./|assets/|data:image/)')) then
      v_img := null;
    end if;
    v_lines := v_lines || (jsonb_build_object(
      'id', p.id, 'name', p.name, 'qty', v_qty, 'price', p.price + v_delta, 'image', v_img,
      'size', left(nullif(l->>'size', ''), 40), 'color', left(nullif(l->>'color', ''), 40))
      || case when v_opts is null then '{}'::jsonb else jsonb_build_object('options', v_opts) end);
    v_sub := v_sub + (p.price + v_delta) * v_qty;
  end loop;

  -- Stock suffisant (quantités cumulées par produit, toutes tailles / options confondues)
  for v_need in
    select x->>'id' as id, x->>'name' as name, sum((x->>'qty')::int) as qty
      from jsonb_array_elements(v_lines) x group by 1, 2
  loop
    select stock into p from public.catalog_products where id = v_need.id;
    if p.stock < v_need.qty then
      raise exception 'OUT_OF_STOCK|%|%', v_need.name, p.stock using errcode = 'P0001';
    end if;
  end loop;

  -- Codes promo validés côté serveur
  v_code := upper(nullif(trim(new.promo_code), ''));
  if v_code = 'YVES10' then
    v_disc := round(v_sub * 0.1);
  elsif v_code = 'BIENVENUE' and v_sub >= 30000 then
    v_disc := 5000;
  else
    v_code := null; v_disc := 0;
  end if;

  -- Livraison : gratuite dès 50 000 FCFA (après réduction) ou en retrait boutique
  if new.shipping = 'retrait' or v_sub - v_disc >= 50000 then v_ship := 0;
  elsif new.shipping = 'abidjan' then v_ship := 2000;
  else v_ship := 3500;
  end if;

  new.lines := v_lines;
  new.promo_code := v_code;
  new.subtotal := v_sub;
  new.discount := v_disc;
  new.shipping_cost := v_ship;
  new.total := greatest(0, v_sub - v_disc + v_ship);
  return new;
end;
$$;

-- ═════════════ Journal des actions de l'Assistant IA ═════════════
create table if not exists public.ai_actions_log (
  id bigserial primary key,
  action text not null,
  summary text not null,
  auto boolean not null default false,
  ok boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.ai_actions_log enable row level security;
drop policy if exists ai_actions_log_admin_read on public.ai_actions_log;
create policy ai_actions_log_admin_read on public.ai_actions_log for select to authenticated using (public.is_admin());
create or replace function public.admin_log_ai_action(p_action text, p_summary text, p_auto boolean, p_ok boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  insert into public.ai_actions_log (action, summary, auto, ok) values (left(p_action, 40), left(p_summary, 600), coalesce(p_auto, false), coalesce(p_ok, true));
end $$;
revoke all on function public.admin_log_ai_action(text, text, boolean, boolean) from public, anon;
grant execute on function public.admin_log_ai_action(text, text, boolean, boolean) to authenticated;
