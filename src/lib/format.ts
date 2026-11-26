import dayjs from 'dayjs';

export function formatDate(d: string | null | undefined): string {
  return d ? dayjs(d).format('DD/MM/YYYY') : '—';
}

export function toIsoDate(d: Date | string | null | undefined): string | null {
  return d ? dayjs(d).format('YYYY-MM-DD') : null;
}

export const KIND_LABEL: Record<string, string> = { box: 'Box', sealed: 'Sealed', card: 'Carta' };
export const STATUS_LABEL: Record<string, string> = {
  owned: 'Posseduto',
  for_sale: 'In vendita',
  sold: 'Venduto',
  opened: 'Aperta',
};
export const STATUS_COLOR: Record<string, string> = {
  owned: 'blue',
  for_sale: 'orange',
  sold: 'gray',
  opened: 'grape',
};
export const PLATFORM_LABEL: Record<string, string> = {
  cardmarket: 'Cardmarket',
  ebay: 'eBay',
  vinted: 'Vinted',
  diretto: 'Diretto',
  altro: 'Altro',
};
export const MOVEMENT_LABEL: Record<string, string> = {
  purchase: 'Acquisto',
  preorder_payment: 'Pagamento preordine',
  sale: 'Vendita',
  expense: 'Spesa',
  settlement: 'Rimborso',
};
export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  box: 'Box',
  booster: 'Booster',
  starter: 'Starter',
  bundle: 'Bundle',
  other: 'Altro',
};
export const PREORDER_STATUS_LABEL: Record<string, string> = {
  ordinato: 'Ordinato',
  arrivato: 'Arrivato',
  ritirato: 'Ritirato',
  annullato: 'Annullato',
};
export const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];
export const LANGUAGES = ['Italiano', 'Inglese', 'Giapponese', 'Cinese', 'Francese', 'Tedesco', 'Spagnolo'];
