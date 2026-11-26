import type { QueryClient } from '@tanstack/react-query';

/** Dopo ogni operazione economica: tutto ciò che dipende da articoli e soldi. */
export function invalidateMoney(qc: QueryClient) {
  for (const k of ['items', 'purchases', 'sales', 'preorders', 'movements', 'balances', 'dashboard', 'stores']) {
    qc.invalidateQueries({ queryKey: [k] });
  }
}
