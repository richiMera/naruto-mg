import { formatCents } from '../../lib/money';

type B = { member_id: string; display_name: string; balance_cents: number };

/** Frase "X deve a Y € N" per due membri (con più membri indica il maggior debitore/creditore). */
export function balanceText(balances: B[]): string {
  if (balances.length < 2 || balances.every((b) => b.balance_cents === 0)) return 'Siete pari';
  const sorted = [...balances].sort((a, b) => a.balance_cents - b.balance_cents);
  const debtor = sorted[0];
  const creditor = sorted[sorted.length - 1];
  return `${debtor.display_name} deve a ${creditor.display_name} ${formatCents(Math.min(-debtor.balance_cents, creditor.balance_cents))}`;
}

export function debtPair(balances: B[]): { from: string; to: string; amount: number } | null {
  if (balances.length < 2 || balances.every((b) => b.balance_cents === 0)) return null;
  const sorted = [...balances].sort((a, b) => a.balance_cents - b.balance_cents);
  return { from: sorted[0].member_id, to: sorted[sorted.length - 1].member_id, amount: Math.min(-sorted[0].balance_cents, sorted[sorted.length - 1].balance_cents) };
}
