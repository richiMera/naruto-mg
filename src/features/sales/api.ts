import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { invalidateMoney } from '../../lib/invalidate';
import type { Platform } from '../../lib/types';
import type { Share } from '../../lib/money';

export type SaleRow = {
  id: string;
  sold_on: string;
  platform: Platform;
  buyer_note: string | null;
  fees_cents: number;
  shipping_cents: number;
  sale_lines: { item_id: string; price_cents: number; items: { catalog_cards: { name: string } | null; catalog_products: { name: string } | null } | null }[];
  money_movements: { amount_cents: number; member_id: string }[];
};

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('sales')
          .select('*, sale_lines(item_id, price_cents, items(catalog_cards(name), catalog_products(name))), money_movements(amount_cents, member_id)')
          .order('sold_on', { ascending: false })
          .order('created_at', { ascending: false }),
      ) as SaleRow[],
  });
}

export function useMarginsBySale() {
  return useQuery({
    queryKey: ['sales', 'margins'],
    queryFn: async () => {
      const rows = unwrap(await supabase.from('item_margins').select('sale_id, margin_cents, cost_cents')) as { sale_id: string; margin_cents: number; cost_cents: number | null }[];
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.sale_id, (m.get(r.sale_id) ?? 0) + r.margin_cents);
      return m;
    },
  });
}

export type SaleInput = {
  sold_on: string;
  platform: Platform;
  buyer_note: string | null;
  fees_cents: number;
  shipping_cents: number;
  lines: { item_id: string; price_cents: number }[];
  received_by: string;
  shares: Share[];
};

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: SaleInput) =>
      unwrap(
        await supabase.rpc('create_sale', {
          p_sold_on: s.sold_on,
          p_platform: s.platform,
          p_buyer_note: s.buyer_note,
          p_fees_cents: s.fees_cents,
          p_shipping_cents: s.shipping_cents,
          p_lines: s.lines,
          p_received_by: s.received_by,
          p_shares: s.shares,
        }),
      ) as string,
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.rpc('delete_sale', { p_id: id })),
    onSuccess: () => invalidateMoney(qc),
  });
}
