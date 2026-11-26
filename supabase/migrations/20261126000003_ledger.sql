-- Movimenti di denaro, quote, saldo tra membri

create table public.money_movements (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default current_date,
  kind text not null check (kind in ('purchase','preorder_payment','sale','expense','settlement')),
  amount_cents bigint not null check (amount_cents > 0),
  member_id uuid not null references public.members (user_id),
  counterpart_member_id uuid references public.members (user_id),
  purchase_id uuid,
  preorder_id uuid,
  sale_id uuid,
  description text,
  created_at timestamptz not null default now(),
  constraint money_movements_settlement check (
    (kind = 'settlement' and counterpart_member_id is not null and counterpart_member_id <> member_id)
    or (kind <> 'settlement' and counterpart_member_id is null)
  )
);
create index money_movements_member_id_idx on public.money_movements (member_id);
create index money_movements_counterpart_idx on public.money_movements (counterpart_member_id);
create index money_movements_purchase_id_idx on public.money_movements (purchase_id);
create index money_movements_preorder_id_idx on public.money_movements (preorder_id);
create index money_movements_sale_id_idx on public.money_movements (sale_id);
create index money_movements_occurred_on_idx on public.money_movements (occurred_on desc);

create table public.movement_shares (
  movement_id uuid not null references public.money_movements (id) on delete cascade,
  member_id uuid not null references public.members (user_id),
  share_bp int not null check (share_bp between 0 and 10000),
  primary key (movement_id, member_id)
);
create index movement_shares_member_id_idx on public.movement_shares (member_id);

-- Verifica a fine transazione che le quote sommino al 100%
create or replace function private.check_movement_shares()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_kind text;
  v_sum bigint;
  v_count int;
begin
  if tg_table_name = 'money_movements' then
    v_id := new.id;
  elsif tg_op = 'DELETE' then
    v_id := old.movement_id;
  else
    v_id := new.movement_id;
  end if;

  select kind into v_kind from public.money_movements where id = v_id;
  if v_kind is null then
    return null; -- movimento cancellato
  end if;

  select coalesce(sum(share_bp), 0), count(*) into v_sum, v_count
  from public.movement_shares where movement_id = v_id;

  if v_kind = 'settlement' then
    if v_count > 0 then
      raise exception 'Un rimborso non ha quote';
    end if;
  elsif v_sum <> 10000 then
    raise exception 'Le quote del movimento devono sommare al 100%%';
  end if;
  return null;
end;
$$;

create constraint trigger money_movements_shares_check
  after insert or update on public.money_movements
  deferrable initially deferred
  for each row execute function private.check_movement_shares();

create constraint trigger movement_shares_check
  after insert or update or delete on public.movement_shares
  deferrable initially deferred
  for each row execute function private.check_movement_shares();

alter table public.money_movements enable row level security;
alter table public.movement_shares enable row level security;
create policy money_movements_members on public.money_movements for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
create policy movement_shares_members on public.movement_shares for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
revoke all on public.money_movements, public.movement_shares from anon;

-- Helper: richiede che l'utente sia membro
create or replace function private.require_member()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not (select private.is_member()) then
    raise exception 'Account non autorizzato' using errcode = '42501';
  end if;
end;
$$;
grant execute on function private.require_member() to authenticated;

-- Helper: inserisce le quote da jsonb [{"member_id": ..., "share_bp": ...}]
create or replace function private.insert_shares(p_movement_id uuid, p_shares jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_shares is null or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Quote mancanti';
  end if;
  insert into public.movement_shares (movement_id, member_id, share_bp)
  select p_movement_id, (s->>'member_id')::uuid, (s->>'share_bp')::int
  from jsonb_array_elements(p_shares) s;
end;
$$;
grant execute on function private.insert_shares(uuid, jsonb) to authenticated;

create or replace function public.create_movement(
  p_kind text,
  p_amount_cents bigint,
  p_member_id uuid,
  p_occurred_on date,
  p_description text,
  p_shares jsonb,
  p_preorder_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare v_id uuid;
begin
  perform private.require_member();
  if p_kind not in ('expense','preorder_payment') then
    raise exception 'Tipo di movimento non consentito qui';
  end if;
  if p_kind = 'preorder_payment' and p_preorder_id is null then
    raise exception 'Preordine mancante';
  end if;
  insert into public.money_movements (occurred_on, kind, amount_cents, member_id, preorder_id, description)
  values (coalesce(p_occurred_on, current_date), p_kind, p_amount_cents, p_member_id, p_preorder_id, p_description)
  returning id into v_id;
  perform private.insert_shares(v_id, p_shares);
  return v_id;
end;
$$;

create or replace function public.record_settlement(
  p_from uuid,
  p_to uuid,
  p_amount_cents bigint,
  p_occurred_on date,
  p_description text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare v_id uuid;
begin
  perform private.require_member();
  if p_from = p_to then
    raise exception 'Il rimborso deve essere tra due membri diversi';
  end if;
  insert into public.money_movements (occurred_on, kind, amount_cents, member_id, counterpart_member_id, description)
  values (coalesce(p_occurred_on, current_date), 'settlement', p_amount_cents, p_from, p_to, p_description)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_movement(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare v_kind text;
begin
  perform private.require_member();
  select kind into v_kind from public.money_movements where id = p_id;
  if v_kind is null then
    raise exception 'Movimento non trovato';
  end if;
  if v_kind not in ('expense','preorder_payment','settlement') then
    raise exception 'Questo movimento si elimina dall''acquisto o dalla vendita collegata';
  end if;
  delete from public.money_movements where id = p_id;
end;
$$;

grant execute on function public.create_movement(text, bigint, uuid, date, text, jsonb, uuid) to authenticated;
grant execute on function public.record_settlement(uuid, uuid, bigint, date, text) to authenticated;
grant execute on function public.delete_movement(uuid) to authenticated;

-- Quota in centesimi di ogni membro per ogni movimento (somma esatta)
create view public.movement_share_amounts
with (security_invoker = true) as
select m.id as movement_id, m.kind, m.occurred_on, a.member_id, a.cents
from public.money_movements m
cross join lateral (
  select array_agg(s.member_id order by s.member_id) as mids,
         array_agg(s.share_bp::bigint order by s.member_id) as bps
  from public.movement_shares s
  where s.movement_id = m.id
) sh
cross join lateral unnest(sh.mids, private.allocate_cents(m.amount_cents, sh.bps)) as a(member_id, cents)
where m.kind <> 'settlement' and sh.mids is not null;

-- Saldo: positivo = gli altri devono soldi a questo membro
create view public.member_balances
with (security_invoker = true) as
select
  mb.user_id as member_id,
  mb.display_name,
  coalesce(p.paid, 0)::bigint as paid_cents,
  coalesce(es.cents, 0)::bigint as expense_share_cents,
  coalesce(r.received, 0)::bigint as received_cents,
  coalesce(isa.cents, 0)::bigint as income_share_cents,
  coalesce(so.cents, 0)::bigint as settled_out_cents,
  coalesce(si.cents, 0)::bigint as settled_in_cents,
  (coalesce(p.paid, 0) - coalesce(es.cents, 0) - coalesce(r.received, 0)
    + coalesce(isa.cents, 0) + coalesce(so.cents, 0) - coalesce(si.cents, 0))::bigint as balance_cents
from public.members mb
left join (
  select member_id, sum(amount_cents) as paid from public.money_movements
  where kind in ('purchase','preorder_payment','expense') group by member_id
) p on p.member_id = mb.user_id
left join (
  select member_id, sum(cents) as cents from public.movement_share_amounts
  where kind in ('purchase','preorder_payment','expense') group by member_id
) es on es.member_id = mb.user_id
left join (
  select member_id, sum(amount_cents) as received from public.money_movements
  where kind = 'sale' group by member_id
) r on r.member_id = mb.user_id
left join (
  select member_id, sum(cents) as cents from public.movement_share_amounts
  where kind = 'sale' group by member_id
) isa on isa.member_id = mb.user_id
left join (
  select member_id, sum(amount_cents) as cents from public.money_movements
  where kind = 'settlement' group by member_id
) so on so.member_id = mb.user_id
left join (
  select counterpart_member_id as member_id, sum(amount_cents) as cents from public.money_movements
  where kind = 'settlement' group by counterpart_member_id
) si on si.member_id = mb.user_id;

revoke all on public.movement_share_amounts, public.member_balances from anon;
