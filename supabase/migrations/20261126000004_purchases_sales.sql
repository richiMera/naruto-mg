-- Acquisti, vendite, costi e margini

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores (id),
  preorder_id uuid,
  purchased_on date not null default current_date,
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index purchases_store_id_idx on public.purchases (store_id);
create index purchases_preorder_id_idx on public.purchases (preorder_id);

create table public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  item_id uuid not null unique references public.items (id) on delete cascade,
  price_cents bigint not null check (price_cents >= 0),
  shipping_share_cents bigint not null default 0
);
create index purchase_lines_purchase_id_idx on public.purchase_lines (purchase_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sold_on date not null default current_date,
  platform text not null check (platform in ('cardmarket','ebay','vinted','diretto','altro')),
  buyer_note text,
  fees_cents bigint not null default 0 check (fees_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  item_id uuid not null unique references public.items (id),
  price_cents bigint not null check (price_cents >= 0),
  costs_share_cents bigint not null default 0
);
create index sale_lines_sale_id_idx on public.sale_lines (sale_id);

alter table public.money_movements
  add constraint money_movements_purchase_fk foreign key (purchase_id) references public.purchases (id) on delete cascade,
  add constraint money_movements_sale_fk foreign key (sale_id) references public.sales (id) on delete cascade;

do $$
declare t text;
begin
  foreach t in array array['purchases','purchase_lines','sales','sale_lines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_member())) with check ((select private.is_member()))',
      t || '_members', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

create or replace function public.create_purchase(
  p_store_id uuid,
  p_purchased_on date,
  p_shipping_cents bigint,
  p_notes text,
  p_lines jsonb,
  p_paid_by uuid,
  p_shares jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_purchase_id uuid;
  v_line jsonb;
  v_copies int;
  v_item_id uuid;
  v_line_ids uuid[] := '{}';
  v_prices bigint[] := '{}';
  v_alloc bigint[];
  v_total bigint := 0;
  v_mov_id uuid;
  i int;
begin
  perform private.require_member();
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'L''acquisto deve avere almeno una riga';
  end if;
  if coalesce(p_shipping_cents, 0) < 0 then
    raise exception 'Spedizione non valida';
  end if;

  insert into public.purchases (store_id, purchased_on, shipping_cents, notes)
  values (p_store_id, coalesce(p_purchased_on, current_date), coalesce(p_shipping_cents, 0), p_notes)
  returning id into v_purchase_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_copies := coalesce((v_line->>'copies')::int, 1);
    if v_copies < 1 or v_copies > 500 then
      raise exception 'Numero di copie non valido';
    end if;
    if coalesce((v_line->>'price_cents_each')::bigint, -1) < 0 then
      raise exception 'Prezzo non valido';
    end if;
    for i in 1..v_copies loop
      insert into public.items (kind, catalog_card_id, catalog_product_id, condition, language)
      values (
        v_line->>'kind',
        nullif(v_line->>'catalog_card_id', '')::uuid,
        nullif(v_line->>'catalog_product_id', '')::uuid,
        nullif(v_line->>'condition', ''),
        nullif(v_line->>'language', '')
      )
      returning id into v_item_id;

      insert into public.purchase_lines (purchase_id, item_id, price_cents)
      values (v_purchase_id, v_item_id, (v_line->>'price_cents_each')::bigint)
      returning id into v_item_id;

      v_line_ids := v_line_ids || v_item_id;
      v_prices := v_prices || (v_line->>'price_cents_each')::bigint;
      v_total := v_total + (v_line->>'price_cents_each')::bigint;
    end loop;
  end loop;

  if coalesce(p_shipping_cents, 0) > 0 then
    v_alloc := private.allocate_cents(p_shipping_cents, v_prices);
    for i in 1..array_length(v_line_ids, 1) loop
      update public.purchase_lines set shipping_share_cents = v_alloc[i] where id = v_line_ids[i];
    end loop;
  end if;

  v_total := v_total + coalesce(p_shipping_cents, 0);
  if v_total > 0 then
    insert into public.money_movements (occurred_on, kind, amount_cents, member_id, purchase_id, description)
    values (coalesce(p_purchased_on, current_date), 'purchase', v_total, p_paid_by, v_purchase_id, p_notes)
    returning id into v_mov_id;
    perform private.insert_shares(v_mov_id, p_shares);
  end if;

  return v_purchase_id;
end;
$$;

create or replace function public.create_sale(
  p_sold_on date,
  p_platform text,
  p_buyer_note text,
  p_fees_cents bigint,
  p_shipping_cents bigint,
  p_lines jsonb,
  p_received_by uuid,
  p_shares jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_sale_id uuid;
  v_line jsonb;
  v_line_id uuid;
  v_line_ids uuid[] := '{}';
  v_prices bigint[] := '{}';
  v_alloc bigint[];
  v_gross bigint := 0;
  v_costs bigint := coalesce(p_fees_cents, 0) + coalesce(p_shipping_cents, 0);
  v_status text;
  v_mov_id uuid;
  i int;
begin
  perform private.require_member();
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'La vendita deve avere almeno un articolo';
  end if;

  insert into public.sales (sold_on, platform, buyer_note, fees_cents, shipping_cents)
  values (coalesce(p_sold_on, current_date), p_platform, p_buyer_note, coalesce(p_fees_cents, 0), coalesce(p_shipping_cents, 0))
  returning id into v_sale_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select status into v_status from public.items
    where id = (v_line->>'item_id')::uuid
    for update;
    if v_status is null then
      raise exception 'Articolo non trovato';
    end if;
    if v_status in ('sold','opened') then
      raise exception 'Articolo già venduto o aperto';
    end if;
    if coalesce((v_line->>'price_cents')::bigint, -1) < 0 then
      raise exception 'Prezzo non valido';
    end if;

    update public.items set status = 'sold' where id = (v_line->>'item_id')::uuid;

    insert into public.sale_lines (sale_id, item_id, price_cents)
    values (v_sale_id, (v_line->>'item_id')::uuid, (v_line->>'price_cents')::bigint)
    returning id into v_line_id;

    v_line_ids := v_line_ids || v_line_id;
    v_prices := v_prices || (v_line->>'price_cents')::bigint;
    v_gross := v_gross + (v_line->>'price_cents')::bigint;
  end loop;

  if v_gross - v_costs <= 0 then
    raise exception 'Il netto della vendita deve essere positivo';
  end if;

  if v_costs > 0 then
    v_alloc := private.allocate_cents(v_costs, v_prices);
    for i in 1..array_length(v_line_ids, 1) loop
      update public.sale_lines set costs_share_cents = v_alloc[i] where id = v_line_ids[i];
    end loop;
  end if;

  insert into public.money_movements (occurred_on, kind, amount_cents, member_id, sale_id, description)
  values (coalesce(p_sold_on, current_date), 'sale', v_gross - v_costs, p_received_by, v_sale_id, p_buyer_note)
  returning id into v_mov_id;
  perform private.insert_shares(v_mov_id, p_shares);

  return v_sale_id;
end;
$$;

create or replace function public.delete_purchase(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.require_member();
  if exists (
    select 1 from public.purchase_lines pl join public.items i on i.id = pl.item_id
    where pl.purchase_id = p_id and i.status in ('sold','opened')
  ) then
    raise exception 'Impossibile eliminare: alcuni articoli sono già stati venduti o aperti';
  end if;
  delete from public.items where id in (select item_id from public.purchase_lines where purchase_id = p_id);
  delete from public.purchases where id = p_id;
end;
$$;

create or replace function public.delete_sale(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.require_member();
  update public.items set status = 'owned'
  where id in (select item_id from public.sale_lines where sale_id = p_id);
  delete from public.sales where id = p_id;
end;
$$;

grant execute on function public.create_purchase(uuid, date, bigint, text, jsonb, uuid, jsonb) to authenticated;
grant execute on function public.create_sale(date, text, text, bigint, bigint, jsonb, uuid, jsonb) to authenticated;
grant execute on function public.delete_purchase(uuid) to authenticated;
grant execute on function public.delete_sale(uuid) to authenticated;

create view public.item_costs
with (security_invoker = true) as
select i.id as item_id,
       coalesce(pl.price_cents + pl.shipping_share_cents, i.allocated_cost_cents) as cost_cents
from public.items i
left join public.purchase_lines pl on pl.item_id = i.id;

create view public.item_margins
with (security_invoker = true) as
select sl.item_id, sl.sale_id, s.sold_on, sl.price_cents, sl.costs_share_cents,
       c.cost_cents,
       sl.price_cents - sl.costs_share_cents - coalesce(c.cost_cents, 0) as margin_cents
from public.sale_lines sl
join public.sales s on s.id = sl.sale_id
left join public.item_costs c on c.item_id = sl.item_id;

revoke all on public.item_costs, public.item_margins from anon;
