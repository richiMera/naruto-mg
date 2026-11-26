import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ActionIcon, Anchor, Badge, Button, Card, FileButton, Grid, Group, Image, NumberInput, Select, SimpleGrid, Stack, Switch, Table, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconPhoto, IconTrash } from '@tabler/icons-react';
import { QueryState } from '../../components/QueryState';
import { MoneyInput } from '../../components/MoneyInput';
import { useAddValuation, useBoxContents, useDeleteValuation, useItem, useItemOrigin, useUpdateItem, useUploadPhoto } from './api';
import { formatCents } from '../../lib/money';
import { CONDITIONS, KIND_LABEL, LANGUAGES, STATUS_COLOR, STATUS_LABEL, formatDate, toIsoDate } from '../../lib/format';
import { itemName, itemSetLabel, type ItemRow } from '../../lib/types';
import { photoUrl } from '../../lib/supabase';
import { notifyError, notifyOk } from '../../lib/notify';

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text fw={500}>{children}</Text>
    </div>
  );
}

function EditCard({ item }: { item: ItemRow }) {
  const update = useUpdateItem();
  const [v, setV] = useState({
    condition: item.condition,
    language: item.language,
    grading_company: item.grading_company ?? '',
    grade: item.grade,
    notes: item.notes ?? '',
  });
  useEffect(() => {
    setV({ condition: item.condition, language: item.language, grading_company: item.grading_company ?? '', grade: item.grade, notes: item.notes ?? '' });
  }, [item]);

  const save = async () => {
    try {
      await update.mutateAsync({
        id: item.id,
        patch: { condition: v.condition, language: v.language, grading_company: v.grading_company.trim() || null, grade: v.grade, notes: v.notes.trim() || null },
      });
      notifyOk('Salvato');
    } catch (e) {
      notifyError(e);
    }
  };

  const editable = item.status !== 'sold' && item.status !== 'opened';

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Title order={4}>Dettagli</Title>
          <Badge variant="light" color={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Badge>
        </Group>
        {editable && (
          <Group>
            <Switch
              label="In vendita"
              checked={item.status === 'for_sale'}
              onChange={(e) => update.mutate({ id: item.id, patch: { status: e.currentTarget.checked ? 'for_sale' : 'owned' } }, { onError: notifyError })}
            />
            <Switch
              label="In vetrina pubblica"
              checked={item.showcase}
              onChange={(e) => update.mutate({ id: item.id, patch: { showcase: e.currentTarget.checked } }, { onError: notifyError })}
            />
          </Group>
        )}
        <SimpleGrid cols={2}>
          <Select label="Condizione" data={CONDITIONS} clearable searchable value={v.condition} onChange={(x) => setV({ ...v, condition: x })} />
          <Select label="Lingua" data={LANGUAGES} clearable searchable value={v.language} onChange={(x) => setV({ ...v, language: x })} />
          <TextInput label="Gradazione (ente)" placeholder="PSA, BGS, CGC…" value={v.grading_company} onChange={(e) => setV({ ...v, grading_company: e.currentTarget.value })} />
          <NumberInput label="Voto" min={1} max={10} step={0.5} decimalScale={1} value={v.grade ?? ''} onChange={(x) => setV({ ...v, grade: typeof x === 'number' ? x : null })} />
        </SimpleGrid>
        <Textarea label="Note" autosize minRows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.currentTarget.value })} />
        <Group justify="flex-end">
          <Button onClick={save} loading={update.isPending}>Salva dettagli</Button>
        </Group>
      </Stack>
    </Card>
  );
}

function PhotoCard({ item }: { item: ItemRow }) {
  const upload = useUploadPhoto();
  const src = photoUrl(item.photo_path) ?? item.catalog_cards?.image_url ?? item.catalog_products?.image_url ?? null;
  return (
    <Card withBorder>
      <Stack align="center">
        {src ? <Image src={src} mah={320} w="auto" fit="contain" radius="sm" /> : <IconPhoto size={64} color="var(--mantine-color-gray-4)" />}
        <FileButton
          accept="image/png,image/jpeg,image/webp"
          onChange={(file) => file && upload.mutate({ itemId: item.id, file, oldPath: item.photo_path }, { onError: notifyError, onSuccess: () => notifyOk('Foto caricata') })}
        >
          {(props) => (
            <Button {...props} variant="light" size="xs" loading={upload.isPending}>
              {item.photo_path ? 'Cambia foto' : 'Carica foto'}
            </Button>
          )}
        </FileButton>
      </Stack>
    </Card>
  );
}

function ValuationsCard({ item }: { item: ItemRow }) {
  const origin = useItemOrigin(item.id);
  const add = useAddValuation();
  const del = useDeleteValuation();
  const [value, setValue] = useState<number | null>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [source, setSource] = useState('');

  return (
    <Card withBorder>
      <Stack>
        <Title order={4}>Valore di mercato</Title>
        <Group align="flex-end" wrap="wrap">
          <MoneyInput label="Valore" value={value} onChange={setValue} w={130} />
          <DateInput label="Data" value={date} onChange={(d) => setDate(d as Date | null)} valueFormat="DD/MM/YYYY" w={140} />
          <TextInput label="Fonte" placeholder="Cardmarket trend…" value={source} onChange={(e) => setSource(e.currentTarget.value)} style={{ flex: 1, minWidth: 140 }} />
          <Button
            disabled={value == null}
            loading={add.isPending}
            onClick={() =>
              add.mutate(
                { item_id: item.id, value_cents: value!, valued_on: toIsoDate(date) ?? toIsoDate(new Date())!, source: source.trim() || null },
                { onSuccess: () => { setValue(null); setSource(''); origin.refetch(); }, onError: notifyError },
              )
            }
          >
            Aggiungi
          </Button>
        </Group>
        <QueryState query={origin}>
          {(o) =>
            o.valuations.length === 0 ? (
              <Text size="sm" c="dimmed">Nessuna valutazione.</Text>
            ) : (
              <Table>
                <Table.Tbody>
                  {o.valuations.map((v) => (
                    <Table.Tr key={v.id}>
                      <Table.Td>{formatDate(v.valued_on)}</Table.Td>
                      <Table.Td fw={500}>{formatCents(v.value_cents)}</Table.Td>
                      <Table.Td c="dimmed">{v.source}</Table.Td>
                      <Table.Td w={40}>
                        <ActionIcon variant="subtle" color="red" onClick={() => del.mutate(v.id, { onSuccess: () => origin.refetch(), onError: notifyError })}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )
          }
        </QueryState>
      </Stack>
    </Card>
  );
}

function EconomicsCard({ item }: { item: ItemRow }) {
  const origin = useItemOrigin(item.id);
  return (
    <Card withBorder>
      <Stack gap="sm">
        <Title order={4}>Economia</Title>
        <QueryState query={origin}>
          {(o) => (
            <SimpleGrid cols={2}>
              <Info label="Costo totale">{formatCents(item.cost_cents)}</Info>
              <Info label="Valore attuale">{formatCents(item.value_cents)}</Info>
              {o.purchase && (
                <Info label="Acquistato">
                  {formatDate(o.purchase.purchased_on)} {o.purchase.stores?.name ? `· ${o.purchase.stores.name}` : ''}
                  {o.purchase.preorder_id ? ' (preordine)' : ''}
                </Info>
              )}
              {o.price_cents != null && (
                <Info label="Prezzo + spedizione">
                  {formatCents(o.price_cents)} + {formatCents(o.shipping_share_cents)}
                </Info>
              )}
              {item.opened_from_item_id && (
                <Info label="Uscita da">
                  <Anchor component={Link} to={`/collezione/${item.opened_from_item_id}`}>box aperta</Anchor>
                </Info>
              )}
              {o.sale && (
                <>
                  <Info label="Venduto">{formatDate(o.sale.sold_on)} a {formatCents(o.sale.price_cents)}</Info>
                  <Info label="Margine">
                    <Text span c={o.sale.margin_cents >= 0 ? 'teal' : 'red'} fw={600}>{formatCents(o.sale.margin_cents)}</Text>
                  </Info>
                </>
              )}
              {item.cost_cents != null && item.value_cents != null && !o.sale && (
                <Info label="Plus/minus stimata">
                  <Text span c={item.value_cents - item.cost_cents >= 0 ? 'teal' : 'red'} fw={600}>{formatCents(item.value_cents - item.cost_cents)}</Text>
                </Info>
              )}
            </SimpleGrid>
          )}
        </QueryState>
      </Stack>
    </Card>
  );
}

function BoxContentsCard({ item }: { item: ItemRow }) {
  const contents = useBoxContents(item.id);
  return (
    <Card withBorder>
      <Title order={4} mb="sm">Carte uscite</Title>
      <QueryState query={contents}>
        {(rows) => {
          const value = rows.reduce((a, r) => a + (r.value_cents ?? 0), 0);
          return (
            <>
              <Text size="sm" mb="xs">
                {rows.length} carte · valore stimato {formatCents(value)}
                {item.cost_cents != null && (
                  <> · ROI <Text span fw={600} c={value - item.cost_cents >= 0 ? 'teal' : 'red'}>{formatCents(value - item.cost_cents)}</Text></>
                )}
              </Text>
              <Table>
                <Table.Tbody>
                  {rows.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td><Anchor component={Link} to={`/collezione/${r.id}`}>{itemName(r)}</Anchor></Table.Td>
                      <Table.Td>{itemSetLabel(r)}</Table.Td>
                      <Table.Td>{r.catalog_cards?.rarity}</Table.Td>
                      <Table.Td ta="right">{formatCents(r.value_cents)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          );
        }}
      </QueryState>
    </Card>
  );
}

export function ItemDetailPage() {
  const { id } = useParams();
  const item = useItem(id);
  const navigate = useNavigate();
  return (
    <QueryState query={item}>
      {(i) => (
        <Stack>
          <Group justify="space-between">
            <Group>
              <ActionIcon variant="subtle" onClick={() => navigate(-1)} aria-label="Indietro"><IconArrowLeft /></ActionIcon>
              <div>
                <Title order={2}>{itemName(i)}</Title>
                <Text c="dimmed">{KIND_LABEL[i.kind]} · {itemSetLabel(i)} {i.catalog_cards?.rarity ? `· ${i.catalog_cards.rarity}` : ''}</Text>
              </div>
            </Group>
            {i.kind === 'box' && (i.status === 'owned' || i.status === 'for_sale') && (
              <Button component={Link} to={`/box/${i.id}/apri`}>Apri box</Button>
            )}
          </Group>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}><PhotoCard item={i} /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack>
                <EconomicsCard item={i} />
                <EditCard item={i} />
              </Stack>
            </Grid.Col>
            {i.kind === 'box' && i.status === 'opened' && <Grid.Col span={12}><BoxContentsCard item={i} /></Grid.Col>}
            <Grid.Col span={12}><ValuationsCard item={i} /></Grid.Col>
          </Grid>
        </Stack>
      )}
    </QueryState>
  );
}
