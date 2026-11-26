import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';

export type WishlistRow = {
  id: string;
  catalog_card_id: string | null;
  catalog_product_id: string | null;
  free_text: string | null;
  target_price_cents: number | null;
  priority: 1 | 2 | 3;
  notes: string | null;
  catalog_cards: { name: string; set_code: string; number: string } | null;
  catalog_products: { name: string } | null;
};

export function useWishlist() {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () =>
      unwrap(await supabase.from('wishlist').select('*, catalog_cards(name, set_code, number), catalog_products(name)').order('priority').order('created_at')) as WishlistRow[],
  });
}

export function useSaveWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...v }: Partial<Omit<WishlistRow, 'catalog_cards' | 'catalog_products'>>) => {
      const q = id ? supabase.from('wishlist').update(v).eq('id', id) : supabase.from('wishlist').insert(v);
      return unwrap(await q);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}

export function useDeleteWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('wishlist').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}
