import { useState } from 'react';
import { ActionIcon, Badge, Button, Drawer, Table, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { usePurchases, useDeletePurchase, type PurchaseRow } from './api';
import { PurchaseForm } from './PurchaseForm';
import { formatCents } from '../../lib/money';
import { formatDate } from '../../lib/format';
import { useMemberName } from '../../auth/AuthProvider';
import { confirmAction, notifyError, notifyOk } from '../../lib/notify';

function summary(p: PurchaseRow) {
  const names = new Map<string, number>();
  for (const l of p.purchase_lines) {
    const n = l.items?.catalog_cards?.name ?? l.items?.catalog_products?.name ?? '?';
    names.set(n, (names.get(n) ?? 0) + 1);
  }
  return [...names.entries()].map(([n, c]) => (c > 1 ? `${c}× ${n}` : n)).join(', ');
}

export function PurchasesTable({ storeId }: { storeId?: string }) {
  const purchases = usePurchases(storeId);
  const del = useDeletePurchase();
  const memberName = useMemberName();
  return (
    <QueryState query={purchases}>
      {(list) =>
        list.length === 0 ? (
          <Text c="dimmed">Nessun acquisto.</Text>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Negozio</Table.Th>
                  <Table.Th>Articoli</Table.Th>
                  <Table.Th>Pagato da</Table.Th>
                  <Table.Th ta="right">Totale</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {list.map((p) => {
                  const total = p.purchase_lines.reduce((a, l) => a + l.price_cents, 0) + p.shipping_cents;
                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td>{formatDate(p.purchased_on)}</Table.Td>
                      <Table.Td>{p.stores?.name ?? '—'}</Table.Td>
                      <Table.Td>
                        {summary(p)} {p.preorder_id && <Badge size="xs" variant="light">preordine</Badge>}
                      </Table.Td>
                      <Table.Td>{p.preorder_id ? 'vedi preordine' : memberName(p.money_movements[0]?.member_id)}</Table.Td>
                      <Table.Td ta="right">{formatCents(total)}</Table.Td>
                      <Table.Td w={40}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label="Elimina acquisto"
                          onClick={() =>
                            confirmAction({
                              title: 'Eliminare l\'acquisto?',
                              message: 'Verranno eliminati anche gli articoli e il movimento di denaro collegati.',
                              onConfirm: () => del.mutate(p.id, { onSuccess: () => notifyOk('Acquisto eliminato'), onError: notifyError }),
                            })
                          }
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )
      }
    </QueryState>
  );
}

export function PurchasesPage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Acquisti">
        <Button leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>Nuovo acquisto</Button>
      </PageHeader>
      <PurchasesTable />
      <Drawer opened={open} onClose={() => setOpen(false)} title="Nuovo acquisto" position="right" size="lg">
        {open && <PurchaseForm onDone={() => setOpen(false)} />}
      </Drawer>
    </>
  );
}
