export type ItemKind = 'box' | 'sealed' | 'card';
export type ItemStatus = 'owned' | 'for_sale' | 'sold' | 'opened';
export type ProductType = 'box' | 'booster' | 'starter' | 'bundle' | 'other';
export type Platform = 'cardmarket' | 'ebay' | 'vinted' | 'diretto' | 'altro';
export type MovementKind = 'purchase' | 'preorder_payment' | 'sale' | 'expense' | 'settlement';
export type PreorderStatus = 'ordinato' | 'arrivato' | 'ritirato' | 'annullato';

export type Member = { user_id: string; display_name: string };

export type CatalogCard = {
  id: string;
  game: string;
  set_code: string;
  set_name: string | null;
  number: string;
  name: string;
  rarity: string | null;
  variant: string;
  image_url: string | null;
};

export type CatalogProduct = {
  id: string;
  game: string;
  name: string;
  product_type: ProductType;
  set_code: string | null;
  image_url: string | null;
};

export type Store = {
  id: string;
  name: string;
  kind: 'online' | 'fisico';
  url: string | null;
  city: string | null;
  notes: string | null;
};

export type Item = {
  id: string;
  kind: ItemKind;
  catalog_card_id: string | null;
  catalog_product_id: string | null;
  status: ItemStatus;
  condition: string | null;
  language: string | null;
  grading_company: string | null;
  grade: number | null;
  opened_from_item_id: string | null;
  allocated_cost_cents: number | null;
  showcase: boolean;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
};

export type ItemRow = Item & {
  catalog_cards: CatalogCard | null;
  catalog_products: CatalogProduct | null;
  cost_cents: number | null;
  value_cents: number | null;
};

export type Movement = {
  id: string;
  occurred_on: string;
  kind: MovementKind;
  amount_cents: number;
  member_id: string;
  counterpart_member_id: string | null;
  purchase_id: string | null;
  preorder_id: string | null;
  sale_id: string | null;
  description: string | null;
  movement_shares: { member_id: string; share_bp: number }[];
};

export type Balance = {
  member_id: string;
  display_name: string;
  paid_cents: number;
  expense_share_cents: number;
  received_cents: number;
  income_share_cents: number;
  settled_out_cents: number;
  settled_in_cents: number;
  balance_cents: number;
};

export type Preorder = {
  id: string;
  store_id: string;
  catalog_product_id: string | null;
  description: string;
  quantity: number;
  total_cents: number;
  expected_on: string | null;
  status: PreorderStatus;
  notes: string | null;
  created_at: string;
};

export function itemName(i: Pick<ItemRow, 'catalog_cards' | 'catalog_products'>): string {
  return i.catalog_cards?.name ?? i.catalog_products?.name ?? '—';
}

export function itemSetLabel(i: Pick<ItemRow, 'catalog_cards' | 'catalog_products'>): string {
  if (i.catalog_cards) return `${i.catalog_cards.set_code} #${i.catalog_cards.number}`;
  return i.catalog_products?.set_code ?? '';
}
