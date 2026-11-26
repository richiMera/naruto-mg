-- I progetti Supabase recenti non concedono privilegi automatici sulle tabelle.
-- Gli utenti autenticati ricevono i privilegi; chi vede cosa lo decidono le policy RLS (solo membri).

grant usage on schema public to authenticated;

grant select on public.members to authenticated;

grant select, insert, update, delete on
  public.catalog_cards, public.catalog_products, public.stores, public.items,
  public.item_valuations, public.wishlist,
  public.money_movements, public.movement_shares,
  public.purchases, public.purchase_lines, public.sales, public.sale_lines,
  public.preorders
to authenticated;

grant select on
  public.item_current_value, public.movement_share_amounts, public.member_balances,
  public.item_costs, public.item_margins, public.preorder_status
to authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
