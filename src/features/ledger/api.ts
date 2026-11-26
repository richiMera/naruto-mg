import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { invalidateMoney } from '../../lib/invalidate';
import type { Balance, Movement } from '../../lib/types';
import type { Share } from '../../lib/money';

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: async () => unwrap(await supabase.from('member_balances').select('*').order('display_name')) as Balance[],
  });
}

export function useMovements() {
  return useQuery({
    queryKey: ['movements'],
    queryFn: async () =>
      unwrap(
        await supabase.from('money_movements').select('*, movement_shares(member_id, share_bp)').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }),
      ) as Movement[],
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { amount_cents: number; member_id: string; occurred_on: string; description: string | null; shares: Share[] }) =>
      unwrap(
        await supabase.rpc('create_movement', {
          p_kind: 'expense',
          p_amount_cents: v.amount_cents,
          p_member_id: v.member_id,
          p_occurred_on: v.occurred_on,
          p_description: v.description,
          p_shares: v.shares,
        }),
      ),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useRecordSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { from: string; to: string; amount_cents: number; occurred_on: string; description: string | null }) =>
      unwrap(await supabase.rpc('record_settlement', { p_from: v.from, p_to: v.to, p_amount_cents: v.amount_cents, p_occurred_on: v.occurred_on, p_description: v.description })),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.rpc('delete_movement', { p_id: id })),
    onSuccess: () => invalidateMoney(qc),
  });
}
