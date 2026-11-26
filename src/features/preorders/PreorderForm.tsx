import { useState } from 'react';
import { Button, Group, NumberInput, Stack, TextInput, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { StorePicker } from '../stores/StorePicker';
import { CatalogPicker } from '../catalog/CatalogPicker';
import { MoneyInput } from '../../components/MoneyInput';
import { toIsoDate } from '../../lib/format';
import type { Preorder } from '../../lib/types';
import { useSavePreorder } from './api';
import { notifyError, notifyOk } from '../../lib/notify';

export function PreorderForm({ initial, onDone }: { initial?: Preorder; onDone: () => void }) {
  const save = useSavePreorder();
  const [storeId, setStoreId] = useState<string | null>(initial?.store_id ?? null);
  const [productId, setProductId] = useState<string | null>(initial?.catalog_product_id ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [total, setTotal] = useState<number | null>(initial?.total_cents ?? null);
  const [expected, setExpected] = useState<Date | null>(initial?.expected_on ? dayjs(initial.expected_on).toDate() : null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tried, setTried] = useState(false);

  const valid = !!storeId && description.trim() !== '' && total != null && quantity >= 1;

  const submit = async () => {
    setTried(true);
    if (!valid) return;
    try {
      await save.mutateAsync({
        id: initial?.id,
        store_id: storeId!,
        catalog_product_id: productId,
        description: description.trim(),
        quantity,
        total_cents: total!,
        expected_on: toIsoDate(expected),
        notes: notes.trim() || null,
      });
      notifyOk('Preordine salvato');
      onDone();
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <Stack>
      <StorePicker value={storeId} onChange={setStoreId} required error={tried && !storeId ? 'Scegli un negozio' : undefined} />
      <CatalogPicker
        kind="product"
        label="Prodotto (serve per segnarlo arrivato)"
        value={productId}
        onChange={(id) => setProductId(id)}
      />
      <TextInput label="Descrizione" required placeholder="es. Box set 3 – 2 pezzi" value={description} onChange={(e) => setDescription(e.currentTarget.value)} error={tried && !description.trim() ? 'Obbligatoria' : undefined} />
      <Group grow align="flex-start">
        <NumberInput label="Quantità" min={1} value={quantity} onChange={(v) => setQuantity(Math.max(1, Number(v) || 1))} />
        <MoneyInput label="Prezzo totale" required value={total} onChange={setTotal} error={tried && total == null ? 'Obbligatorio' : undefined} />
      </Group>
      <DateInput label="Uscita prevista" value={expected} onChange={(d) => setExpected(d as Date | null)} valueFormat="DD/MM/YYYY" clearable />
      <Textarea label="Note" autosize minRows={2} value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
      <Button onClick={submit} loading={save.isPending}>Salva preordine</Button>
    </Stack>
  );
}
