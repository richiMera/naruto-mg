import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Store } from '../../lib/types';

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => unwrap(await supabase.from('stores').select('*').order('name')) as Store[],
  });
}

export function useStore(id: string | undefined) {
  return useQuery({
    queryKey: ['stores', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('stores').select('*').eq('id', id!).single()) as Store,
  });
}

export function useSaveStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...v }: Partial<Store>) => {
      const q = id ? supabase.from('stores').update(v).eq('id', id).select().single() : supabase.from('stores').insert(v).select().single();
      return unwrap(await q) as Store;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}
