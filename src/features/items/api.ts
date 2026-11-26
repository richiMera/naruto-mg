import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap, PHOTO_BUCKET } from '../../lib/supabase';
import type { Item, ItemRow } from '../../lib/types';

const ITEM_SELECT = '*, catalog_cards(*), catalog_products(*)';

async function costMaps(ids?: string[]) {
  let c = supabase.from('item_costs').select('item_id, cost_cents');
  let v = supabase.from('item_current_value').select('item_id, value_cents');
  if (ids) {
    c = c.in('item_id', ids);
    v = v.in('item_id', ids);
  }
  const [costs, values] = await Promise.all([c, v]);
  const cm = new Map<string, number | null>((unwrap(costs) as { item_id: string; cost_cents: number | null }[]).map((r) => [r.item_id, r.cost_cents]));
  const vm = new Map<string, number>((unwrap(values) as { item_id: string; value_cents: number }[]).map((r) => [r.item_id, r.value_cents]));
  return { cm, vm };
}

function merge(items: Omit<ItemRow, 'cost_cents' | 'value_cents'>[], cm: Map<string, number | null>, vm: Map<string, number>): ItemRow[] {
  return items.map((i) => ({ ...i, cost_cents: cm.get(i.id) ?? null, value_cents: vm.get(i.id) ?? null }));
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const [items, maps] = await Promise.all([supabase.from('items').select(ITEM_SELECT).order('created_at', { ascending: false }), costMaps()]);
      return merge(unwrap(items) as ItemRow[], maps.cm, maps.vm);
    },
  });
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: ['items', id],
    enabled: !!id,
    queryFn: async () => {
      const [item, maps] = await Promise.all([supabase.from('items').select(ITEM_SELECT).eq('id', id!).single(), costMaps([id!])]);
      return merge([unwrap(item) as ItemRow], maps.cm, maps.vm)[0];
    },
  });
}

export function useBoxContents(boxId: string | undefined) {
  return useQuery({
    queryKey: ['items', 'box', boxId],
    enabled: !!boxId,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('items').select(ITEM_SELECT).eq('opened_from_item_id', boxId!)) as ItemRow[];
      const maps = await costMaps(rows.map((r) => r.id));
      return merge(rows, maps.cm, maps.vm);
    },
  });
}

export type ItemOrigin = {
  purchase: { id: string; purchased_on: string; preorder_id: string | null; stores: { name: string } | null } | null;
  price_cents: number | null;
  shipping_share_cents: number | null;
  sale: { sale_id: string; sold_on: string; price_cents: number; costs_share_cents: number; margin_cents: number } | null;
  valuations: { id: string; valued_on: string; value_cents: number; source: string | null }[];
};

export function useItemOrigin(id: string | undefined) {
  return useQuery({
    queryKey: ['items', id, 'origin'],
    enabled: !!id,
    queryFn: async (): Promise<ItemOrigin> => {
      const [pl, margin, vals] = await Promise.all([
        supabase.from('purchase_lines').select('price_cents, shipping_share_cents, purchases(id, purchased_on, preorder_id, stores(name))').eq('item_id', id!).maybeSingle(),
        supabase.from('item_margins').select('sale_id, sold_on, price_cents, costs_share_cents, margin_cents').eq('item_id', id!).maybeSingle(),
        supabase.from('item_valuations').select('id, valued_on, value_cents, source').eq('item_id', id!).order('valued_on', { ascending: false }).order('created_at', { ascending: false }),
      ]);
      const line = unwrap(pl) as { price_cents: number; shipping_share_cents: number; purchases: ItemOrigin['purchase'] } | null;
      return {
        purchase: line?.purchases ?? null,
        price_cents: line?.price_cents ?? null,
        shipping_share_cents: line?.shipping_share_cents ?? null,
        sale: unwrap(margin) as ItemOrigin['sale'],
        valuations: unwrap(vals) as ItemOrigin['valuations'],
      };
    },
  });
}

export type ItemPatch = Partial<Pick<Item, 'status' | 'condition' | 'language' | 'grading_company' | 'grade' | 'showcase' | 'notes' | 'photo_path'>>;

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ItemPatch }) => unwrap(await supabase.from('items').update(patch).eq('id', id).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useAddValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { item_id: string; value_cents: number; valued_on: string; source: string | null }) =>
      unwrap(await supabase.from('item_valuations').insert(v).select().single()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('item_valuations').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUploadPhoto() {
  const update = useUpdateItem();
  return useMutation({
    mutationFn: async ({ itemId, file, oldPath }: { itemId: string; file: File; oldPath: string | null }) => {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `items/${itemId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      await update.mutateAsync({ id: itemId, patch: { photo_path: path } });
      if (oldPath) await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
      return path;
    },
  });
}
