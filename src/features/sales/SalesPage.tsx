import { useState } from 'react';
import { ActionIcon, Button, Drawer, Table, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { useDeleteSale, useMarginsBySale, useSales } from './api';
import { SaleForm } from './SaleForm';
import { formatCents } from '../../lib/money';
import { PLATFORM_LABEL, formatDate } from '../../lib/format';
import { useMemberName } from '../../auth/AuthProvider';
import { confirmAction, notifyError, notifyOk } from '../../lib/notify';

export function SalesPage() {
  const [open, setOpen] = useState(false);
  const sales = useSales();
  const margins = useMarginsBySale();
  const del = useDeleteSale();
  const memberName = useMemberName();
  return (
    <>
      <PageHeader title="Vendite">
        <Button leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>Nuova vendita</Button>
      </PageHeader>
      <QueryState query={sales}>
        {(list) =>
          list.length === 0 ? (
            <Text c="dimmed">Nessuna vendita.</Text>
          ) : (
            <Table.ScrollContainer minWidth={720}>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Data</Table.Th>
                    <Table.Th>Articoli</Table.Th>
                    <Table.Th>Piattaforma</Table.Th>
                    <Table.Th>Incassato da</Table.Th>
                    <Table.Th ta="right">Netto</Table.Th>
                    <Table.Th ta="right">Margine</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {list.map((s) => {
                    const m = margins.data?.get(s.id);
                    return (
                      <Table.Tr key={s.id}>
                        <Table.Td>{formatDate(s.sold_on)}</Table.Td>
                        <Table.Td>{s.sale_lines.map((l) => l.items?.catalog_cards?.name ?? l.items?.catalog_products?.name).join(', ')}</Table.Td>
                        <Table.Td>{PLATFORM_LABEL[s.platform]}</Table.Td>
                        <Table.Td>{memberName(s.money_movements[0]?.member_id)}</Table.Td>
                        <Table.Td ta="right">{formatCents(s.money_movements[0]?.amount_cents)}</Table.Td>
                        <Table.Td ta="right">
                          <Text span c={m == null ? undefined : m >= 0 ? 'teal' : 'red'}>{formatCents(m)}</Text>
                        </Table.Td>
                        <Table.Td w={40}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Elimina vendita"
                            onClick={() =>
                              confirmAction({
                                title: 'Eliminare la vendita?',
                                message: 'Gli articoli torneranno in collezione e il movimento di incasso verrà eliminato.',
                                onConfirm: () => del.mutate(s.id, { onSuccess: () => notifyOk('Vendita eliminata'), onError: notifyError }),
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
      <Drawer opened={open} onClose={() => setOpen(false)} title="Nuova vendita" position="right" size="lg">
        {open && <SaleForm onDone={() => setOpen(false)} />}
      </Drawer>
    </>
  );
}
