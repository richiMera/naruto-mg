-- Vetrina pubblica (solo dati descrittivi) e storage foto

create or replace function public.get_showcase()
returns table (
  item_id uuid,
  kind text,
  name text,
  set_code text,
  set_name text,
  number text,
  rarity text,
  condition text,
  language text,
  grading_company text,
  grade numeric,
  photo_path text,
  image_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.kind,
         coalesce(cc.name, cp.name),
         coalesce(cc.set_code, cp.set_code),
         cc.set_name, cc.number, cc.rarity,
         i.condition, i.language, i.grading_company, i.grade,
         i.photo_path,
         coalesce(cc.image_url, cp.image_url)
  from public.items i
  left join public.catalog_cards cc on cc.id = i.catalog_card_id
  left join public.catalog_products cp on cp.id = i.catalog_product_id
  where i.showcase = true and i.status <> 'sold'
  order by i.kind, coalesce(cc.set_code, cp.set_code), cc.number, coalesce(cc.name, cp.name);
$$;

revoke all on function public.get_showcase() from public;
grant execute on function public.get_showcase() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy item_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (select private.is_member()));
create policy item_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'item-photos' and (select private.is_member()));
create policy item_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (select private.is_member()));
