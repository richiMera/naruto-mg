import { useState } from 'react';
import { ActionIcon, Button, Card, Divider, Group, NumberInput, SegmentedControl, Select, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { StorePicker } from '../stores/StorePicker';
import { CatalogPicker } from '../catalog/CatalogPicker';
import { MoneyInput } from '../../components/MoneyInput';
import { SharesInput } from '../../components/SharesInput';
import { MemberSelect } from '../../components/MemberSelect';
import { useAuth } from '../../auth/AuthProvider';
import { formatCents, sharesTotal, splitEqual, type Share } from '../../lib/money';
import { CONDITIONS, LANGUAGES, toIsoDate } from '../../lib/format';
import type { ItemKind } from '../../lib/types';
import { useCreatePurchase } from './api';
import { notifyError, notifyOk } from '../../lib/notify';

type Line = {
  key: number;
  kind: ItemKind;
  catalog_id: string | null;
  condition: string | null;
  language: string | null;
  copies: number;
  price: number | null;
};

let nextKey = 1;
const newLine = (kind: ItemKind = 'card'): Line => ({ key: nextKey++, kind, catalog_id: null, condition: null, language: null, copies: 1, price: null });

export function PurchaseForm({ onDone }: { onDone: () => void }) {
  const { member, members } = useAuth();
  const create = useCreatePurchase();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [shipping, setShipping] = useState<number | null>(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [paidBy, setPaidBy] = useState<string | null>(member?.user_id ?? null);
  const [shares, setShares] = useState<Share[]>(splitEqual(members.map((m) => m.user_id)));
  const [tried, setTried] = useState(false);

  const subtotal = lines.reduce((a, l) => a + (l.price ?? 0) * l.copies, 0);
  const total = subtotal + (shipping ?? 0);
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const invalidLine = (l: Line) => !l.catalog_id || l.price == null || l.copies < 1;
  const valid = lines.length > 0 && !lines.some(invalidLine) && shipping != null && !!paidBy && sharesTotal(shares) === 10000 && !!date;

  const submit = async () => {
    setTried(true);
    if (!valid) return;
    try {
      await create.mutateAsync({
        store_id: storeId,
        purchased_on: toIsoDate(date)!,
        shipping_cents: shipping ?? 0,
        notes: notes.trim() || null,
        paid_by: paidBy!,
        shares,
        lines: lines.map((l) => ({
          kind: l.kind,
          catalog_card_id: l.kind === 'card' ? l.catalog_id : null,
          catalog_product_id: l.kind === 'card' ? null : l.catalog_id,
          condition: l.condition,
          language: l.language,
          copies: l.copies,
          price_cents_each: l.price!,
        })),
      });
      notifyOk('Acquisto registrato');
      onDone();
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <Stack>
      <Group grow align="flex-end">
        <StorePicker value={storeId} onChange={setStoreId} allowEmpty />
        <DateInput label="Data" value={date} onChange={(d) => setDate(d as Date | null)} valueFormat="DD/MM/YYYY" required />
      </Group>

      {lines.map((l, idx) => (
        <Card key={l.key} withBorder padding="sm">
          <Stack gap="xs">
            <Group justify="space-between">
              <SegmentedControl
                size="xs"
                value={l.kind}
                onChange={(v) => update(l.key, { kind: v as ItemKind, catalog_id: null })}
                data={[{ value: 'card', label: 'Carta' }, { value: 'box', label: 'Box' }, { value: 'sealed', label: 'Sealed' }]}
              />
              {lines.length > 1 && (
                <ActionIcon variant="subtle" color="red" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={`Rimuovi riga ${idx + 1}`}>
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
            <CatalogPicker
              kind={l.kind === 'card' ? 'card' : 'product'}
              value={l.catalog_id}
              onChange={(v) => update(l.key, { catalog_id: v })}
              required
              error={tried && !l.catalog_id ? 'Scegli o crea una voce' : undefined}
            />
            <Group grow align="flex-start">
              <NumberInput label="Copie" min={1} max={500} value={l.copies} onChange={(v) => update(l.key, { copies: Math.max(1, Number(v) || 1) })} />
              <MoneyInput label="Prezzo cad." value={l.price} onChange={(v) => update(l.key, { price: v })} required error={tried && l.price == null ? 'Obbligatorio' : undefined} />
            </Group>
            {l.kind === 'card' && (
              <Group grow>
                <Select label="Condizione" data={CONDITIONS} clearable value={l.condition} onChange={(v) => update(l.key, { condition: v })} />
                <Select label="Lingua" data={LANGUAGES} clearable value={l.language} onChange={(v) => update(l.key, { language: v })} />
              </Group>
            )}
          </Stack>
        </Card>
      ))}
      <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => setLines((ls) => [...ls, newLine(ls[ls.length - 1]?.kind)])}>
        Aggiungi riga
      </Button>

      <Group grow align="flex-start">
        <MoneyInput label="Spedizione" value={shipping} onChange={setShipping} />
        <TextInput label="Note" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
      </Group>

      <Divider />
      <MemberSelect label="Pagato da" members={members} value={paidBy} onChange={setPaidBy} />
      <SharesInput members={members} value={shares} onChange={setShares} label="Di chi è la spesa" />

      <Group justify="space-between">
        <Text fw={700} size="lg">Totale {formatCents(total)}</Text>
        <Button onClick={submit} loading={create.isPending}>Registra acquisto</Button>
      </Group>
      {tried && !valid && <Text c="red" size="sm">Controlla i campi evidenziati.</Text>}
    </Stack>
  );
}
