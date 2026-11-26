import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { invalidateMoney } from '../../lib/invalidate';
import type { Preorder } from '../../lib/types';
import type { Share } from '../../lib/money';

export type PreorderRow = Preorder & {
  stores: { name: string } | null;
  catalog_products: { name: string; product_type: string } | null;
  paid_cents: number;
  remaining_cents: number;
};

export function usePreorders(storeId?: string) {
  return useQuery({
    queryKey: ['preorders', storeId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('preorders').select('*, stores(name), catalog_products(name, product_type)').order('expected_on', { ascending: true, nullsFirst: false });
      if (storeId) q = q.eq('store_id', storeId);
      const [rows, status] = await Promise.all([q, supabase.from('preorder_status').select('*')]);
      const sm = new Map((unwrap(status) as { preorder_id: string; paid_cents: number; remaining_cents: number }[]).map((s) => [s.preorder_id, s]));
      return (unwrap(rows) as Omit<PreorderRow, 'paid_cents' | 'remaining_cents'>[]).map((p) => ({
        ...p,
        paid_cents: sm.get(p.id)?.paid_cents ?? 0,
        remaining_cents: sm.get(p.id)?.remaining_cents ?? p.total_cents,
      }));
    },
  });
}

export function usePreorderPayments(preorderId: string | null) {
  return useQuery({
    queryKey: ['movements', 'preorder', preorderId],
    enabled: !!preorderId,
    queryFn: async () =>
      unwrap(await supabase.from('money_movements').select('id, occurred_on, amount_cents, member_id, description').eq('preorder_id', preorderId!).order('occurred_on')) as {
        id: string; occurred_on: string; amount_cents: number; member_id: string; description: string | null;
      }[],
  });
}

export type PreorderInput = Omit<Preorder, 'id' | 'created_at' | 'status'> & { id?: string; status?: Preorder['status'] };

export function useSavePreorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...v }: Partial<PreorderInput>) => {
      const q = id ? supabase.from('preorders').update(v).eq('id', id).select().single() : supabase.from('preorders').insert(v).select().single();
      return unwrap(await q) as Preorder;
    },
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeletePreorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('preorders').delete().eq('id', id)),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useAddPreorderPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { preorder_id: string; amount_cents: number; member_id: string; occurred_on: string; description: string | null; shares: Share[] }) =>
      unwrap(
        await supabase.rpc('create_movement', {
          p_kind: 'preorder_payment',
          p_amount_cents: v.amount_cents,
          p_member_id: v.member_id,
          p_occurred_on: v.occurred_on,
          p_description: v.description,
          p_shares: v.shares,
          p_preorder_id: v.preorder_id,
        }),
      ),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useMarkArrived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; arrived_on: string; kind: 'box' | 'sealed' }) =>
      unwrap(await supabase.rpc('mark_preorder_arrived', { p_preorder_id: v.id, p_arrived_on: v.arrived_on, p_kind: v.kind })),
    onSuccess: () => invalidateMoney(qc),
  });
}
