-- Catalogo, negozi, articoli, valutazioni, wishlist

create extension if not exists pg_trgm with schema extensions;

create table public.catalog_cards (
  id uuid primary key default gen_random_uuid(),
  game text not null default 'Naruto',
  set_code text not null,
  set_name text,
  number text not null,
  name text not null,
  rarity text,
  variant text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  unique (game, set_code, number, variant)
);
create index catalog_cards_name_trgm on public.catalog_cards using gin (name extensions.gin_trgm_ops);

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  game text not null default 'Naruto',
  name text not null,
  product_type text not null check (product_type in ('box','booster','starter','bundle','other')),
  set_code text,
  image_url text,
  created_at timestamptz not null default now(),
  unique (game, name)
);
create index catalog_products_name_trgm on public.catalog_products using gin (name extensions.gin_trgm_ops);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('online','fisico')),
  url text,
  city text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('box','sealed','card')),
  catalog_card_id uuid references public.catalog_cards (id),
  catalog_product_id uuid references public.catalog_products (id),
  status text not null default 'owned' check (status in ('owned','for_sale','sold','opened')),
  condition text,
  language text,
  grading_company text,
  grade numeric(3,1),
  opened_from_item_id uuid references public.items (id),
  allocated_cost_cents bigint,
  showcase boolean not null default false,
  photo_path text,
  notes text,
  created_at timestamptz not null default now(),
  constraint items_catalog_ref check (
    (kind = 'card' and catalog_card_id is not null and catalog_product_id is null)
    or (kind <> 'card' and catalog_product_id is not null and catalog_card_id is null)
  )
);
create index items_catalog_card_id_idx on public.items (catalog_card_id);
create index items_catalog_product_id_idx on public.items (catalog_product_id);
create index items_opened_from_item_id_idx on public.items (opened_from_item_id);
create index items_status_idx on public.items (status);

create table public.item_valuations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  valued_on date not null default current_date,
  value_cents bigint not null check (value_cents >= 0),
  source text,
  created_at timestamptz not null default now()
);
create index item_valuations_item_id_idx on public.item_valuations (item_id, valued_on desc, created_at desc);

create view public.item_current_value
with (security_invoker = true) as
select distinct on (item_id) item_id, value_cents, valued_on
from public.item_valuations
order by item_id, valued_on desc, created_at desc;

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  catalog_card_id uuid references public.catalog_cards (id) on delete cascade,
  catalog_product_id uuid references public.catalog_products (id) on delete cascade,
  free_text text,
  target_price_cents bigint check (target_price_cents >= 0),
  priority smallint not null default 2 check (priority between 1 and 3),
  notes text,
  created_at timestamptz not null default now(),
  constraint wishlist_one_ref check (
    num_nonnulls(catalog_card_id, catalog_product_id, nullif(free_text, '')) = 1
  )
);
create index wishlist_catalog_card_id_idx on public.wishlist (catalog_card_id);
create index wishlist_catalog_product_id_idx on public.wishlist (catalog_product_id);

-- RLS: tutto riservato ai membri
do $$
declare t text;
begin
  foreach t in array array['catalog_cards','catalog_products','stores','items','item_valuations','wishlist'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_member())) with check ((select private.is_member()))',
      t || '_members', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
revoke all on public.item_current_value from anon;
