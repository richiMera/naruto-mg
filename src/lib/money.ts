const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return eur.format(cents / 100);
}

/**
 * Converte un importo digitato (es. "12,50", "1.234,5", "12.5", "€ 7") in centesimi.
 * Restituisce null se l'input è vuoto, negativo o non valido.
 */
export function parseEuro(input: string): number | null {
  let s = input.replace(/€/g, '').replace(/\s/g, '');
  if (s === '') return null;
  if (!/^[0-9.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let intPart: string;
  let decPart = '';

  if (lastComma >= 0 && lastDot >= 0) {
    // il separatore più a destra è quello decimale
    const decSep = lastComma > lastDot ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    if (s.split(decSep).length > 2) return null;
    [intPart, decPart] = s.split(decSep);
    const groups = intPart.split(thouSep);
    if (groups[0].length < 1 || groups[0].length > 3) return null;
    if (groups.slice(1).some((g) => g.length !== 3)) return null;
    intPart = groups.join('');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = s.split(sep);
    if (parts.length === 2 && parts[1].length <= 2) {
      [intPart, decPart] = parts;
    } else if (sep === '.' && parts.slice(1).every((g) => g.length === 3)) {
      intPart = parts.join(''); // "1.234" = migliaia
    } else {
      return null;
    }
  } else {
    intPart = s;
  }

  if (decPart.length > 2) return null;
  if (intPart === '') intPart = '0';
  if (!/^\d+$/.test(intPart) || (decPart && !/^\d+$/.test(decPart))) return null;
  return Number(intPart) * 100 + Number(decPart.padEnd(2, '0') || '0');
}

export type Share = { member_id: string; share_bp: number };

export function splitEqual(memberIds: string[]): Share[] {
  if (memberIds.length === 0) return [];
  const base = Math.floor(10000 / memberIds.length);
  const rest = 10000 - base * memberIds.length;
  return memberIds.map((id, i) => ({ member_id: id, share_bp: base + (i === 0 ? rest : 0) }));
}

export function sharesTotal(shares: Share[]): number {
  return shares.reduce((s, x) => s + x.share_bp, 0);
}

/** Ripartizione con resto maggiore, come private.allocate_cents in DB. */
export function allocateCents(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  let w = weights;
  let sum = w.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    w = weights.map(() => 1);
    sum = w.length;
  }
  const exact = w.map((x) => (total * x) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((e, i) => ({ i, r: e - Math.floor(e) }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length].i] += 1;
  return out;
}
