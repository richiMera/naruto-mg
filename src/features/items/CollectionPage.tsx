import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Group, SegmentedControl, Select, Stack, Table, Text, TextInput, Checkbox } from '@mantine/core';
import { IconDownload, IconLayoutGrid, IconList, IconPlus, IconSearch, IconStar, IconCards } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { useItems } from './api';
import { formatCents } from '../../lib/money';
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL } from '../../lib/format';
import { centsForCsv, downloadCsv, toCsv } from '../../lib/csv';
import { itemName, itemSetLabel, type ItemRow } from '../../lib/types';
import { TcgCard } from '../../components/TcgCard';
import { photoUrl } from '../../lib/supabase';

const VIEW_KEY = 'nm-collection-view';
function readView(): string {
  try {
    return localStorage.getItem(VIEW_KEY) ?? 'grid';
  } catch {
    return 'grid';
  }
}

function CollectionGrid({ items }: { items: ItemRow[] }) {
  const navigate = useNavigate();
  return (
    <div className="tcg-grid">
      {items.map((i) => {
        const card = i.catalog_cards;
        const margin = i.value_cents != null && i.cost_cents != null ? i.value_cents - i.cost_cents : null;
        const label = i.status !== 'owned' ? STATUS_LABEL[i.status] : card?.rarity ?? (i.kind !== 'card' ? KIND_LABEL[i.kind] : null);
        return (
          <TcgCard
            key={i.id}
            seed={i.catalog_card_id ?? i.catalog_product_id ?? i.id}
            kind={i.kind}
            title={itemName(i)}
            subtitle={[itemSetLabel(i), i.condition].filter(Boolean).join(' · ')}
            rarity={card?.rarity}
            image={photoUrl(i.photo_path) ?? card?.image_url ?? i.catalog_products?.image_url}
            badge={label && (
              <Badge size="sm" variant="filled" color={i.status !== 'owned' ? STATUS_COLOR[i.status] : 'dark.6'} style={{ boxShadow: '0 2px 8px #0008' }}>
                {i.showcase && <IconStar size={10} style={{ marginRight: 4 }} />}
                {label}
              </Badge>
            )}
            footer={
              <>
                <Text size="xs" fw={600}>{i.value_cents != null ? formatCents(i.value_cents) : formatCents(i.cost_cents)}</Text>
                {margin != null ? (
                  <Text size="xs" c={margin >= 0 ? 'teal.4' : 'red.4'}>{margin >= 0 ? '+' : '−'}{formatCents(Math.abs(margin))}</Text>
                ) : (
                  <Text size="xs" c="dimmed">{i.value_cents == null ? 'costo' : ''}</Text>
                )}
              </>
            }
            onClick={() => navigate(`/collezione/${i.id}`)}
          />
        );
      })}
    </div>
  );
}

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
  const [view, setViewState] = useState(readView);
  const setView = (v: string) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* preferenza non salvata */
    }
  };

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
        <SegmentedControl
          value={view}
          onChange={setView}
          data={[
            { value: 'grid', label: <IconLayoutGrid size={16} style={{ display: 'block' }} aria-label="Griglia" /> },
            { value: 'table', label: <IconList size={16} style={{ display: 'block' }} aria-label="Tabella" /> },
          ]}
        />
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
            {view === 'grid' ? <CollectionGrid items={filtered} /> : (
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
            )}
            {filtered.length === 0 && (
              <Stack align="center" py={48} gap="sm">
                <IconCards size={56} stroke={1.2} color="var(--nm-dim)" />
                <Text c="dimmed" ta="center" maw={420}>
                  {(items.data ?? []).length === 0
                    ? 'La collezione è vuota. Gli articoli entrano da Acquisti, dai Preordini arrivati o aprendo una box.'
                    : 'Nessun articolo con questi filtri.'}
                </Text>
                {(items.data ?? []).length === 0 && (
                  <Button component={Link} to="/acquisti?nuovo=1" leftSection={<IconPlus size={16} />}>Registra il primo acquisto</Button>
                )}
              </Stack>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
