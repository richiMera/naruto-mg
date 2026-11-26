import { useState } from 'react';
import { ActionIcon, Badge, Button, Modal, SegmentedControl, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { MoneyInput } from '../../components/MoneyInput';
import { CatalogPicker } from '../catalog/CatalogPicker';
import { useDeleteWishlist, useSaveWishlist, useWishlist, type WishlistRow } from './api';
import { formatCents } from '../../lib/money';
import { notifyError } from '../../lib/notify';

const PRIORITY: Record<number, { label: string; color: string }> = {
  1: { label: 'Alta', color: 'red' },
  2: { label: 'Media', color: 'orange' },
  3: { label: 'Bassa', color: 'gray' },
};

function WishForm({ onDone }: { onDone: () => void }) {
  const save = useSaveWishlist();
  const [mode, setMode] = useState<'card' | 'product' | 'text'>('card');
  const [ref, setRef] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [target, setTarget] = useState<number | null>(null);
  const [priority, setPriority] = useState('2');
  const [notes, setNotes] = useState('');
  const valid = mode === 'text' ? text.trim() !== '' : !!ref;
  return (
    <Stack>
      <SegmentedControl value={mode} onChange={(v) => { setMode(v as typeof mode); setRef(null); }} data={[{ value: 'card', label: 'Carta' }, { value: 'product', label: 'Prodotto' }, { value: 'text', label: 'Testo libero' }]} />
      {mode === 'text' ? (
        <TextInput label="Cosa" value={text} onChange={(e) => setText(e.currentTarget.value)} />
      ) : (
        <CatalogPicker kind={mode} value={ref} onChange={setRef} />
      )}
      <MoneyInput label="Prezzo obiettivo" value={target} onChange={setTarget} />
      <SegmentedControl value={priority} onChange={setPriority} data={[{ value: '1', label: 'Alta' }, { value: '2', label: 'Media' }, { value: '3', label: 'Bassa' }]} />
      <TextInput label="Note" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
      <Button
        disabled={!valid}
        loading={save.isPending}
        onClick={() =>
          save.mutate(
            {
              catalog_card_id: mode === 'card' ? ref : null,
              catalog_product_id: mode === 'product' ? ref : null,
              free_text: mode === 'text' ? text.trim() : null,
              target_price_cents: target,
              priority: Number(priority) as 1 | 2 | 3,
              notes: notes.trim() || null,
            },
            { onSuccess: onDone, onError: notifyError },
          )
        }
      >
        Aggiungi
      </Button>
    </Stack>
  );
}

export function sortWishlist(rows: WishlistRow[]) {
  return [...rows].sort((a, b) => a.priority - b.priority);
}

export function WishlistPage() {
  const wishlist = useWishlist();
  const del = useDeleteWishlist();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Wishlist">
        <Button leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>Aggiungi</Button>
      </PageHeader>
      <QueryState query={wishlist}>
        {(rows) =>
          rows.length === 0 ? (
            <Text c="dimmed">La wishlist è vuota.</Text>
          ) : (
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Priorità</Table.Th>
                  <Table.Th>Cosa</Table.Th>
                  <Table.Th ta="right">Prezzo obiettivo</Table.Th>
                  <Table.Th>Note</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortWishlist(rows).map((w) => (
                  <Table.Tr key={w.id}>
                    <Table.Td><Badge variant="light" color={PRIORITY[w.priority].color}>{PRIORITY[w.priority].label}</Badge></Table.Td>
                    <Table.Td>
                      {w.catalog_cards ? `${w.catalog_cards.name} · ${w.catalog_cards.set_code} #${w.catalog_cards.number}` : w.catalog_products?.name ?? w.free_text}
                    </Table.Td>
                    <Table.Td ta="right">{formatCents(w.target_price_cents)}</Table.Td>
                    <Table.Td>{w.notes}</Table.Td>
                    <Table.Td w={40}>
                      <ActionIcon variant="subtle" color="red" onClick={() => del.mutate(w.id, { onError: notifyError })} aria-label="Rimuovi"><IconTrash size={14} /></ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )
        }
      </QueryState>
      <Modal opened={open} onClose={() => setOpen(false)} title="Aggiungi alla wishlist">
        {open && <WishForm onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}
