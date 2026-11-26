-- Preordini e apertura box

create table public.preorders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  catalog_product_id uuid references public.catalog_products (id),
  description text not null,
  quantity int not null default 1 check (quantity > 0),
  total_cents bigint not null check (total_cents >= 0),
  expected_on date,
  status text not null default 'ordinato' check (status in ('ordinato','arrivato','ritirato','annullato')),
  notes text,
  created_at timestamptz not null default now()
);
create index preorders_store_id_idx on public.preorders (store_id);
create index preorders_catalog_product_id_idx on public.preorders (catalog_product_id);
create index preorders_status_expected_idx on public.preorders (status, expected_on);

alter table public.preorders enable row level security;
create policy preorders_members on public.preorders for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
revoke all on public.preorders from anon;

alter table public.money_movements
  add constraint money_movements_preorder_fk foreign key (preorder_id) references public.preorders (id) on delete cascade;
alter table public.purchases
  add constraint purchases_preorder_fk foreign key (preorder_id) references public.preorders (id) on delete restrict;

create view public.preorder_status
with (security_invoker = true) as
select p.id as preorder_id,
       coalesce(sum(m.amount_cents), 0)::bigint as paid_cents,
       (p.total_cents - coalesce(sum(m.amount_cents), 0))::bigint as remaining_cents
from public.preorders p
left join public.money_movements m on m.preorder_id = p.id and m.kind = 'preorder_payment'
group by p.id, p.total_cents;
revoke all on public.preorder_status from anon;

create or replace function public.mark_preorder_arrived(
  p_preorder_id uuid,
  p_arrived_on date,
  p_kind text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_pre public.preorders%rowtype;
  v_purchase_id uuid;
  v_prices bigint[];
  v_item_id uuid;
  i int;
begin
  perform private.require_member();
  if p_kind not in ('box','sealed') then
    raise exception 'Tipo non valido: scegli box o sealed';
  end if;
  select * into v_pre from public.preorders where id = p_preorder_id for update;
  if v_pre.id is null then
    raise exception 'Preordine non trovato';
  end if;
  if v_pre.status <> 'ordinato' then
    raise exception 'Il preordine è già stato segnato come arrivato o annullato';
  end if;
  if v_pre.catalog_product_id is null then
    raise exception 'Collega il preordine a un prodotto del catalogo prima di segnarlo come arrivato';
  end if;

  insert into public.purchases (store_id, preorder_id, purchased_on, shipping_cents, notes)
  values (v_pre.store_id, v_pre.id, coalesce(p_arrived_on, current_date), 0, 'Preordine: ' || v_pre.description)
  returning id into v_purchase_id;

  v_prices := private.allocate_cents(v_pre.total_cents, array_fill(1::bigint, array[v_pre.quantity]));
  for i in 1..v_pre.quantity loop
    insert into public.items (kind, catalog_product_id)
    values (p_kind, v_pre.catalog_product_id)
    returning id into v_item_id;
    insert into public.purchase_lines (purchase_id, item_id, price_cents)
    values (v_purchase_id, v_item_id, v_prices[i]);
  end loop;

  update public.preorders set status = 'arrivato' where id = v_pre.id;
  return v_purchase_id;
end;
$$;

-- Sostituisce la versione precedente: annullare l'acquisto di un preordine lo riporta a "ordinato"
create or replace function public.delete_purchase(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare v_preorder_id uuid;
begin
  perform private.require_member();
  if exists (
    select 1 from public.purchase_lines pl join public.items i on i.id = pl.item_id
    where pl.purchase_id = p_id and i.status in ('sold','opened')
  ) then
    raise exception 'Impossibile eliminare: alcuni articoli sono già stati venduti o aperti';
  end if;
  select preorder_id into v_preorder_id from public.purchases where id = p_id;
  delete from public.items where id in (select item_id from public.purchase_lines where purchase_id = p_id);
  delete from public.purchases where id = p_id;
  if v_preorder_id is not null then
    update public.preorders set status = 'ordinato' where id = v_preorder_id;
  end if;
end;
$$;

create or replace function public.open_box(p_box_item_id uuid, p_cards jsonb)
returns setof uuid
language plpgsql
set search_path = ''
as $$
declare
  v_box public.items%rowtype;
  v_cost bigint;
  v_card jsonb;
  v_copies int;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_alloc bigint[];
  n int;
  i int;
begin
  perform private.require_member();
  select * into v_box from public.items where id = p_box_item_id for update;
  if v_box.id is null then
    raise exception 'Box non trovata';
  end if;
  if v_box.kind <> 'box' then
    raise exception 'Solo le box si possono aprire';
  end if;
  if v_box.status not in ('owned','for_sale') then
    raise exception 'La box è già aperta o venduta';
  end if;
  if p_cards is null or jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) = 0 then
    raise exception 'Inserisci almeno una carta uscita';
  end if;

  for v_card in select * from jsonb_array_elements(p_cards) loop
    v_copies := coalesce((v_card->>'copies')::int, 1);
    if v_copies < 1 or v_copies > 500 then
      raise exception 'Numero di copie non valido';
    end if;
    for i in 1..v_copies loop
      insert into public.items (kind, catalog_card_id, condition, language, opened_from_item_id)
      values ('card', (v_card->>'catalog_card_id')::uuid,
              nullif(v_card->>'condition', ''), nullif(v_card->>'language', ''), v_box.id)
      returning id into v_id;
      v_ids := v_ids || v_id;
    end loop;
  end loop;

  select cost_cents into v_cost from public.item_costs where item_id = v_box.id;
  n := array_length(v_ids, 1);
  if v_cost is not null then
    v_alloc := private.allocate_cents(v_cost, array_fill(1::bigint, array[n]));
    for i in 1..n loop
      update public.items set allocated_cost_cents = v_alloc[i] where id = v_ids[i];
    end loop;
  end if;

  update public.items set status = 'opened' where id = v_box.id;
  return query select unnest(v_ids);
end;
$$;

grant execute on function public.mark_preorder_arrived(uuid, date, text) to authenticated;
grant execute on function public.delete_purchase(uuid) to authenticated;
grant execute on function public.open_box(uuid, jsonb) to authenticated;
