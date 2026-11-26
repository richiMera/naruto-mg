import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { invalidateMoney } from '../../lib/invalidate';
import type { ItemKind } from '../../lib/types';
import type { Share } from '../../lib/money';

export type PurchaseRow = {
  id: string;
  purchased_on: string;
  shipping_cents: number;
  notes: string | null;
  store_id: string | null;
  preorder_id: string | null;
  stores: { name: string } | null;
  purchase_lines: {
    price_cents: number;
    items: { id: string; kind: ItemKind; status: string; catalog_cards: { name: string } | null; catalog_products: { name: string } | null } | null;
  }[];
  money_movements: { amount_cents: number; member_id: string }[];
};

export function usePurchases(storeId?: string) {
  return useQuery({
    queryKey: ['purchases', storeId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('purchases')
        .select('*, stores(name), purchase_lines(price_cents, items(id, kind, status, catalog_cards(name), catalog_products(name))), money_movements(amount_cents, member_id)')
        .order('purchased_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (storeId) q = q.eq('store_id', storeId);
      return unwrap(await q) as PurchaseRow[];
    },
  });
}

export type PurchaseLineInput = {
  kind: ItemKind;
  catalog_card_id: string | null;
  catalog_product_id: string | null;
  condition: string | null;
  language: string | null;
  copies: number;
  price_cents_each: number;
};

export type PurchaseInput = {
  store_id: string | null;
  purchased_on: string;
  shipping_cents: number;
  notes: string | null;
  lines: PurchaseLineInput[];
  paid_by: string;
  shares: Share[];
};

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PurchaseInput) =>
      unwrap(
        await supabase.rpc('create_purchase', {
          p_store_id: p.store_id,
          p_purchased_on: p.purchased_on,
          p_shipping_cents: p.shipping_cents,
          p_notes: p.notes,
          p_lines: p.lines,
          p_paid_by: p.paid_by,
          p_shares: p.shares,
        }),
      ) as string,
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.rpc('delete_purchase', { p_id: id })),
    onSuccess: () => invalidateMoney(qc),
  });
}
