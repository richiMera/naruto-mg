import type { ItemKind } from './types';

export type Tier = 'secret' | 'ultra' | 'rare' | 'common' | 'product';

export const TIER_COLOR: Record<Tier, string> = {
  secret: '#f5c542',
  ultra: '#a874ff',
  rare: '#5b8cff',
  common: '#555b6b',
  product: '#ff7a1a',
};

/** Classifica la rarità (testo libero) in una fascia di colore. */
export function rarityTier(rarity: string | null | undefined, kind: ItemKind): Tier {
  if (kind !== 'card') return 'product';
  const s = (rarity ?? '').toLowerCase().trim();
  if (!s) return 'common';
  if (/secret|segret|ultra|gold|\boro\b|\b(scr|sec|ur|mr|sp|ssr|ar)\b/.test(s)) return 'secret';
  if (/super|holo|foil|epic|\bsr\b/.test(s)) return 'ultra';
  if (/rar|\br\b/.test(s)) return 'rare';
  return 'common';
}

export const isHolo = (t: Tier) => t === 'secret' || t === 'ultra';

/** Sfondo segnaposto stabile per un articolo senza immagine. */
export function placeholderArt(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `linear-gradient(160deg, hsl(${hue} 70% 55%), hsl(${(hue + 20) % 360} 75% 22%) 60%, hsl(${hue} 60% 8%))`;
}
