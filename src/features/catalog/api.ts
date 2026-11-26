import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { CatalogCard, CatalogProduct } from '../../lib/types';

export type CatalogKind = 'card' | 'product';

function escapeLike(q: string) {
  return q.replace(/[%_,()]/g, ' ').trim();
}

export function useCatalogSearch(kind: CatalogKind, q: string) {
  return useQuery({
    queryKey: ['catalog', kind, 'search', q],
    queryFn: async () => {
      const term = escapeLike(q);
      if (kind === 'card') {
        let query = supabase.from('catalog_cards').select('*').order('set_code').order('number').limit(20);
        if (term) query = query.or(`name.ilike.%${term}%,set_code.ilike.%${term}%,number.ilike.%${term}%`);
        return unwrap(await query) as CatalogCard[];
      }
      let query = supabase.from('catalog_products').select('*').order('name').limit(20);
      if (term) query = query.or(`name.ilike.%${term}%,set_code.ilike.%${term}%`);
      return unwrap(await query) as CatalogProduct[];
    },
  });
}

export function useCatalogCards() {
  return useQuery({
    queryKey: ['catalog', 'card', 'all'],
    queryFn: async () => unwrap(await supabase.from('catalog_cards').select('*').order('set_code').order('number')) as CatalogCard[],
  });
}

export function useCatalogProducts() {
  return useQuery({
    queryKey: ['catalog', 'product', 'all'],
    queryFn: async () => unwrap(await supabase.from('catalog_products').select('*').order('name')) as CatalogProduct[],
  });
}

export function useCatalogEntry(kind: CatalogKind, id: string | null) {
  return useQuery({
    queryKey: ['catalog', kind, 'one', id],
    enabled: !!id,
    queryFn: async () =>
      unwrap(await supabase.from(kind === 'card' ? 'catalog_cards' : 'catalog_products').select('*').eq('id', id!).single()) as
        | CatalogCard
        | CatalogProduct,
  });
}

export type CardInput = Omit<CatalogCard, 'id'>;
export type ProductInput = Omit<CatalogProduct, 'id'>;

export function useSaveCatalogCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...v }: Partial<CardInput> & { id?: string }) => {
      const q = id
        ? supabase.from('catalog_cards').update(v).eq('id', id).select().single()
        : supabase.from('catalog_cards').insert(v).select().single();
      return unwrap(await q) as CatalogCard;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useSaveCatalogProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...v }: Partial<ProductInput> & { id?: string }) => {
      const q = id
        ? supabase.from('catalog_products').update(v).eq('id', id).select().single()
        : supabase.from('catalog_products').insert(v).select().single();
      return unwrap(await q) as CatalogProduct;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}
