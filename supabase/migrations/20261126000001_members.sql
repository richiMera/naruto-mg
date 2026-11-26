-- Membri, controllo di appartenenza e ripartizione dei centesimi

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_member() from public, anon;
grant execute on function private.is_member() to authenticated;

alter table public.members enable row level security;

create policy members_select on public.members
  for select to authenticated
  using ((select private.is_member()));

-- Ripartisce p_total in parti proporzionali ai pesi con il metodo del resto maggiore.
-- La somma del risultato è sempre esattamente p_total.
create or replace function private.allocate_cents(p_total bigint, p_weights bigint[])
returns bigint[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  n int := coalesce(array_length(p_weights, 1), 0);
  w bigint[];
  wsum numeric := 0;
  result bigint[] := '{}';
  rems numeric[] := '{}';
  assigned bigint := 0;
  leftover bigint;
  i int;
  exact numeric;
  best int;
begin
  if n = 0 then
    raise exception 'allocate_cents: nessun peso';
  end if;
  w := p_weights;
  for i in 1..n loop
    if w[i] is null or w[i] < 0 then
      raise exception 'allocate_cents: peso non valido';
    end if;
    wsum := wsum + w[i];
  end loop;
  if wsum = 0 then
    w := array_fill(1::bigint, array[n]);
    wsum := n;
  end if;
  for i in 1..n loop
    exact := p_total::numeric * w[i] / wsum;
    result := result || floor(exact)::bigint;
    rems := rems || (exact - floor(exact));
    assigned := assigned + floor(exact)::bigint;
  end loop;
  leftover := p_total - assigned;
  while leftover > 0 loop
    best := 1;
    for i in 2..n loop
      if rems[i] > rems[best] then best := i; end if;
    end loop;
    result[best] := result[best] + 1;
    rems[best] := -1;
    leftover := leftover - 1;
  end loop;
  return result;
end;
$$;

grant execute on function private.allocate_cents(bigint, bigint[]) to authenticated;

-- Nessun accesso diretto alle tabelle per gli utenti anonimi
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke execute on functions from public;
