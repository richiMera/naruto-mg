import { useState } from 'react';
import { Badge, Button, Drawer, Group, Menu, Modal, SegmentedControl, Stack, Table, Tabs, Text, ActionIcon } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDots, IconPlus } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { useDeletePreorder, useMarkArrived, usePreorders, useSavePreorder, type PreorderRow } from './api';
import { PreorderForm } from './PreorderForm';
import { PaymentForm } from './PaymentForm';
import { formatCents } from '../../lib/money';
import { PREORDER_STATUS_LABEL, formatDate, toIsoDate } from '../../lib/format';
import type { PreorderStatus } from '../../lib/types';
import { confirmAction, notifyError, notifyOk } from '../../lib/notify';

const STATUS_COLOR: Record<PreorderStatus, string> = { ordinato: 'blue', arrivato: 'teal', ritirato: 'green', annullato: 'gray' };

function ArriveModal({ preorder, onClose }: { preorder: PreorderRow; onClose: () => void }) {
  const mark = useMarkArrived();
  const [kind, setKind] = useState<'box' | 'sealed'>(preorder.catalog_products?.product_type === 'box' ? 'box' : 'sealed');
  const [date, setDate] = useState<Date | null>(new Date());
  return (
    <Stack>
      {!preorder.catalog_product_id && <Text c="red" size="sm">Collega prima il preordine a un prodotto del catalogo (Modifica).</Text>}
      <Text size="sm">Verranno aggiunti {preorder.quantity} articoli alla collezione, con costo totale {formatCents(preorder.total_cents)}. I pagamenti già registrati restano quelli.</Text>
      {preorder.remaining_cents > 0 && <Text size="sm" c="orange">Attenzione: risultano ancora {formatCents(preorder.remaining_cents)} da pagare.</Text>}
      <SegmentedControl value={kind} onChange={(v) => setKind(v as 'box' | 'sealed')} data={[{ value: 'box', label: 'Box (si può aprire)' }, { value: 'sealed', label: 'Sealed' }]} />
      <DateInput label="Arrivato il" value={date} onChange={(d) => setDate(d as Date | null)} valueFormat="DD/MM/YYYY" />
      <Button
        disabled={!preorder.catalog_product_id}
        loading={mark.isPending}
        onClick={() => mark.mutate({ id: preorder.id, arrived_on: toIsoDate(date ?? new Date())!, kind }, { onSuccess: () => { notifyOk('Preordine arrivato: articoli in collezione'); onClose(); }, onError: notifyError })}
      >
        Conferma arrivo
      </Button>
    </Stack>
  );
}

export function PreordersTable({ storeId, status }: { storeId?: string; status?: PreorderStatus | 'all' }) {
  const preorders = usePreorders(storeId);
  const save = useSavePreorder();
  const del = useDeletePreorder();
  const [edit, setEdit] = useState<PreorderRow | null>(null);
  const [pay, setPay] = useState<PreorderRow | null>(null);
  const [arrive, setArrive] = useState<PreorderRow | null>(null);
  const soon = dayjs().add(7, 'day');

  return (
    <>
      <QueryState query={preorders}>
        {(all) => {
          const list = all.filter((p) => !status || status === 'all' || p.status === status);
          if (list.length === 0) return <Text c="dimmed">Nessun preordine.</Text>;
          return (
            <Table.ScrollContainer minWidth={760}>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Uscita</Table.Th>
                    <Table.Th>Negozio</Table.Th>
                    <Table.Th>Prodotto</Table.Th>
                    <Table.Th>Qtà</Table.Th>
                    <Table.Th ta="right">Totale</Table.Th>
                    <Table.Th ta="right">Pagato</Table.Th>
                    <Table.Th ta="right">Da pagare</Table.Th>
                    <Table.Th>Stato</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {list.map((p) => {
                    const near = p.status === 'ordinato' && p.expected_on && dayjs(p.expected_on).isBefore(soon);
                    return (
                      <Table.Tr key={p.id} bg={near ? 'var(--mantine-color-orange-light)' : undefined}>
                        <Table.Td>{formatDate(p.expected_on)}</Table.Td>
                        <Table.Td>{p.stores?.name}</Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{p.description}</Text>
                          {p.catalog_products && <Text size="xs" c="dimmed">{p.catalog_products.name}</Text>}
                        </Table.Td>
                        <Table.Td>{p.quantity}</Table.Td>
                        <Table.Td ta="right">{formatCents(p.total_cents)}</Table.Td>
                        <Table.Td ta="right">{formatCents(p.paid_cents)}</Table.Td>
                        <Table.Td ta="right" fw={p.remaining_cents > 0 ? 600 : undefined}>{formatCents(p.remaining_cents)}</Table.Td>
                        <Table.Td><Badge variant="light" color={STATUS_COLOR[p.status]}>{PREORDER_STATUS_LABEL[p.status]}</Badge></Table.Td>
                        <Table.Td w={40}>
                          <Menu position="bottom-end">
                            <Menu.Target><ActionIcon variant="subtle" aria-label="Azioni"><IconDots size={16} /></ActionIcon></Menu.Target>
                            <Menu.Dropdown>
                              {p.status === 'ordinato' && <Menu.Item onClick={() => setPay(p)}>Registra pagamento</Menu.Item>}
                              {p.status === 'ordinato' && <Menu.Item onClick={() => setArrive(p)}>Segna arrivato</Menu.Item>}
                              {p.status === 'arrivato' && (
                                <Menu.Item onClick={() => save.mutate({ id: p.id, status: 'ritirato' }, { onError: notifyError })}>Segna ritirato</Menu.Item>
                              )}
                              {p.status === 'ordinato' && <Menu.Item onClick={() => setEdit(p)}>Modifica</Menu.Item>}
                              {p.status === 'ordinato' && (
                                <Menu.Item onClick={() => save.mutate({ id: p.id, status: 'annullato' }, { onError: notifyError })}>Annulla preordine</Menu.Item>
                              )}
                              {(p.status === 'ordinato' || p.status === 'annullato') && (
                                <Menu.Item
                                  color="red"
                                  onClick={() =>
                                    confirmAction({
                                      title: 'Eliminare il preordine?',
                                      message: 'Verranno eliminati anche i pagamenti registrati (e quindi il loro effetto sul saldo).',
                                      onConfirm: () => del.mutate(p.id, { onError: notifyError }),
                                    })
                                  }
                                >
                                  Elimina
                                </Menu.Item>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          );
        }}
      </QueryState>
      <Drawer opened={!!edit} onClose={() => setEdit(null)} title="Modifica preordine" position="right">
        {edit && <PreorderForm initial={edit} onDone={() => setEdit(null)} />}
      </Drawer>
      <Modal opened={!!pay} onClose={() => setPay(null)} title={`Pagamento · ${pay?.description ?? ''}`}>
        {pay && <PaymentForm preorder={pay} onDone={() => setPay(null)} />}
      </Modal>
      <Modal opened={!!arrive} onClose={() => setArrive(null)} title={`Arrivato · ${arrive?.description ?? ''}`}>
        {arrive && <ArriveModal preorder={arrive} onClose={() => setArrive(null)} />}
      </Modal>
    </>
  );
}

export function PreordersPage() {
  const [tab, setTab] = useState<string | null>('ordinato');
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title="Preordini">
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>Nuovo preordine</Button>
      </PageHeader>
      <Tabs value={tab} onChange={setTab} mb="md">
        <Tabs.List>
          <Tabs.Tab value="ordinato">In attesa</Tabs.Tab>
          <Tabs.Tab value="arrivato">Arrivati</Tabs.Tab>
          <Tabs.Tab value="ritirato">Ritirati</Tabs.Tab>
          <Tabs.Tab value="annullato">Annullati</Tabs.Tab>
          <Tabs.Tab value="all">Tutti</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Group mb="xs"><Text size="xs" c="dimmed">Le righe evidenziate escono entro 7 giorni.</Text></Group>
      <PreordersTable status={(tab ?? 'ordinato') as PreorderStatus | 'all'} />
      <Drawer opened={creating} onClose={() => setCreating(false)} title="Nuovo preordine" position="right">
        {creating && <PreorderForm onDone={() => setCreating(false)} />}
      </Drawer>
    </>
  );
}
