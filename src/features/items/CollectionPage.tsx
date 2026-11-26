import { useMemo, useState } from 'react';
import { Badge, Button, Group, SegmentedControl, Select, Table, Text, TextInput, Checkbox } from '@mantine/core';
import { IconDownload, IconSearch, IconStar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { useItems } from './api';
import { formatCents } from '../../lib/money';
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL } from '../../lib/format';
import { centsForCsv, downloadCsv, toCsv } from '../../lib/csv';
import { itemName, itemSetLabel, type ItemRow } from '../../lib/types';

export function filterItems(items: ItemRow[], f: { kind: string; status: string; q: string; showcaseOnly: boolean }) {
  const term = f.q.trim().toLowerCase();
  return items.filter((i) => {
    if (f.kind !== 'all' && i.kind !== f.kind) return false;
    if (f.status === 'active' ? i.status === 'sold' || i.status === 'opened' : f.status !== 'all' && i.status !== f.status) return false;
    if (f.showcaseOnly && !i.showcase) return false;
    if (term) {
      const hay = `${itemName(i)} ${itemSetLabel(i)} ${i.catalog_cards?.rarity ?? ''} ${i.condition ?? ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

export function CollectionPage() {
  const items = useItems();
  const navigate = useNavigate();
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState<string>('active');
  const [q, setQ] = useState('');
  const [showcaseOnly, setShowcaseOnly] = useState(false);

  const filtered = useMemo(() => filterItems(items.data ?? [], { kind, status, q, showcaseOnly }), [items.data, kind, status, q, showcaseOnly]);
  const totals = useMemo(
    () => filtered.reduce((a, i) => ({ cost: a.cost + (i.cost_cents ?? 0), value: a.value + (i.value_cents ?? 0) }), { cost: 0, value: 0 }),
    [filtered],
  );

  const exportCsv = () =>
    downloadCsv(
      'collezione.csv',
      toCsv(filtered, [
        { key: 'kind', label: 'Tipo', format: (r) => KIND_LABEL[r.kind] },
        { key: 'id', label: 'Nome', format: (r) => itemName(r) },
        { key: 'catalog_card_id', label: 'Set/Numero', format: (r) => itemSetLabel(r) },
        { key: 'status', label: 'Stato', format: (r) => STATUS_LABEL[r.status] },
        { key: 'condition', label: 'Condizione' },
        { key: 'language', label: 'Lingua' },
        { key: 'cost_cents', label: 'Costo €', format: (r) => centsForCsv(r.cost_cents) },
        { key: 'value_cents', label: 'Valore €', format: (r) => centsForCsv(r.value_cents) },
      ]),
    );

  return (
    <>
      <PageHeader title="Collezione">
        <Button variant="light" leftSection={<IconDownload size={16} />} onClick={exportCsv} disabled={!filtered.length}>
          Esporta CSV
        </Button>
      </PageHeader>
      <Group mb="md" wrap="wrap" align="flex-end">
        <TextInput leftSection={<IconSearch size={16} />} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.currentTarget.value)} style={{ flex: 1, minWidth: 180 }} />
        <SegmentedControl
          value={kind}
          onChange={setKind}
          data={[{ value: 'all', label: 'Tutto' }, { value: 'card', label: 'Carte' }, { value: 'box', label: 'Box' }, { value: 'sealed', label: 'Sealed' }]}
        />
        <Select
          w={170}
          value={status}
          onChange={(v) => setStatus(v ?? 'active')}
          allowDeselect={false}
          data={[
            { value: 'active', label: 'In collezione' },
            { value: 'owned', label: 'Posseduti' },
            { value: 'for_sale', label: 'In vendita' },
            { value: 'sold', label: 'Venduti' },
            { value: 'opened', label: 'Box aperte' },
            { value: 'all', label: 'Tutti' },
          ]}
        />
        <Checkbox label="Solo in vetrina" checked={showcaseOnly} onChange={(e) => setShowcaseOnly(e.currentTarget.checked)} />
      </Group>
      <QueryState query={items}>
        {() => (
          <>
            <Text size="sm" c="dimmed" mb="xs">
              {filtered.length} articoli · costo {formatCents(totals.cost)} · valore stimato {formatCents(totals.value)}
            </Text>
            <Table.ScrollContainer minWidth={720}>
              <Table highlightOnHover striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nome</Table.Th>
                    <Table.Th>Set / N.</Table.Th>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Condizione</Table.Th>
                    <Table.Th>Stato</Table.Th>
                    <Table.Th ta="right">Costo</Table.Th>
                    <Table.Th ta="right">Valore</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((i) => (
                    <Table.Tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/collezione/${i.id}`)}>
                      <Table.Td fw={500}>{itemName(i)}</Table.Td>
                      <Table.Td>{itemSetLabel(i)}</Table.Td>
                      <Table.Td>{KIND_LABEL[i.kind]}</Table.Td>
                      <Table.Td>{[i.condition, i.grading_company && `${i.grading_company} ${i.grade ?? ''}`].filter(Boolean).join(' · ')}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={STATUS_COLOR[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                      </Table.Td>
                      <Table.Td ta="right">{formatCents(i.cost_cents)}</Table.Td>
                      <Table.Td ta="right">{formatCents(i.value_cents)}</Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          {i.showcase && <IconStar size={14} color="var(--mantine-color-yellow-6)" />}
                          {i.kind === 'box' && (i.status === 'owned' || i.status === 'for_sale') && (
                            <Button
                              size="compact-xs"
                              variant="light"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/box/${i.id}/apri`);
                              }}
                            >
                              Apri box
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {filtered.length === 0 && (
              <Text c="dimmed" ta="center" py="lg">
                Nessun articolo. Gli articoli entrano in collezione da Acquisti, Preordini arrivati o aprendo una box.
              </Text>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
