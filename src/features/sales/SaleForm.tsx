import { useMemo, useState } from 'react';
import { ActionIcon, Button, Card, Divider, Group, MultiSelect, Select, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconTrash } from '@tabler/icons-react';
import { useItems } from '../items/api';
import { MoneyInput } from '../../components/MoneyInput';
import { SharesInput } from '../../components/SharesInput';
import { MemberSelect } from '../../components/MemberSelect';
import { useAuth } from '../../auth/AuthProvider';
import { allocateCents, formatCents, sharesTotal, splitEqual, type Share } from '../../lib/money';
import { PLATFORM_LABEL, toIsoDate } from '../../lib/format';
import { itemName, itemSetLabel, type Platform } from '../../lib/types';
import { useCreateSale } from './api';
import { notifyError, notifyOk } from '../../lib/notify';

export function SaleForm({ onDone, preselected }: { onDone: () => void; preselected?: string[] }) {
  const { member, members } = useAuth();
  const items = useItems();
  const create = useCreateSale();
  const [selected, setSelected] = useState<string[]>(preselected ?? []);
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [platform, setPlatform] = useState<Platform>('cardmarket');
  const [date, setDate] = useState<Date | null>(new Date());
  const [fees, setFees] = useState<number | null>(0);
  const [shipping, setShipping] = useState<number | null>(0);
  const [note, setNote] = useState('');
  const [receivedBy, setReceivedBy] = useState<string | null>(member?.user_id ?? null);
  const [shares, setShares] = useState<Share[]>(splitEqual(members.map((m) => m.user_id)));
  const [tried, setTried] = useState(false);

  const sellable = useMemo(() => (items.data ?? []).filter((i) => i.status === 'owned' || i.status === 'for_sale'), [items.data]);
  const byId = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data]);
  const chosen = selected.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => !!x);

  const gross = chosen.reduce((a, i) => a + (prices[i.id] ?? 0), 0);
  const costs = (fees ?? 0) + (shipping ?? 0);
  const net = gross - costs;
  const alloc = allocateCents(costs, chosen.map((i) => prices[i.id] ?? 0));
  const margin = chosen.reduce((a, i, k) => a + (prices[i.id] ?? 0) - (alloc[k] ?? 0) - (i.cost_cents ?? 0), 0);

  const valid = chosen.length > 0 && chosen.every((i) => prices[i.id] != null) && fees != null && shipping != null && net > 0 && !!receivedBy && sharesTotal(shares) === 10000 && !!date;

  const submit = async () => {
    setTried(true);
    if (!valid) return;
    try {
      await create.mutateAsync({
        sold_on: toIsoDate(date)!,
        platform,
        buyer_note: note.trim() || null,
        fees_cents: fees ?? 0,
        shipping_cents: shipping ?? 0,
        lines: chosen.map((i) => ({ item_id: i.id, price_cents: prices[i.id]! })),
        received_by: receivedBy!,
        shares,
      });
      notifyOk('Vendita registrata');
      onDone();
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <Stack>
      <MultiSelect
        label="Articoli venduti"
        searchable
        placeholder="Cerca nella collezione…"
        data={sellable.map((i) => ({ value: i.id, label: `${itemName(i)} · ${itemSetLabel(i)}${i.condition ? ` · ${i.condition}` : ''}${i.status === 'for_sale' ? ' (in vendita)' : ''}` }))}
        value={selected}
        onChange={setSelected}
        nothingFoundMessage="Nessun articolo disponibile"
        error={tried && chosen.length === 0 ? 'Scegli almeno un articolo' : undefined}
      />
      {chosen.map((i) => (
        <Card key={i.id} withBorder padding="xs">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={500} size="sm">{itemName(i)}</Text>
              <Text size="xs" c="dimmed">Costo {formatCents(i.cost_cents)} · valore {formatCents(i.value_cents)}</Text>
            </div>
            <Group gap={4} wrap="nowrap">
              <MoneyInput
                w={120}
                aria-label="Prezzo di vendita"
                value={prices[i.id] ?? null}
                onChange={(v) => setPrices((p) => ({ ...p, [i.id]: v }))}
                error={tried && prices[i.id] == null ? 'Prezzo' : undefined}
              />
              <ActionIcon variant="subtle" color="red" onClick={() => setSelected((s) => s.filter((x) => x !== i.id))}><IconTrash size={14} /></ActionIcon>
            </Group>
          </Group>
        </Card>
      ))}
      <Group grow align="flex-end">
        <Select label="Piattaforma" allowDeselect={false} data={Object.entries(PLATFORM_LABEL).map(([value, label]) => ({ value, label }))} value={platform} onChange={(v) => setPlatform((v ?? 'altro') as Platform)} />
        <DateInput label="Data" value={date} onChange={(d) => setDate(d as Date | null)} valueFormat="DD/MM/YYYY" />
      </Group>
      <Group grow>
        <MoneyInput label="Commissioni" value={fees} onChange={setFees} />
        <MoneyInput label="Spedizione a carico vostro" value={shipping} onChange={setShipping} />
      </Group>
      <TextInput label="Acquirente / note" value={note} onChange={(e) => setNote(e.currentTarget.value)} />
      <Divider />
      <MemberSelect label="Incassato da" members={members} value={receivedBy} onChange={setReceivedBy} />
      <SharesInput members={members} value={shares} onChange={setShares} label="Di chi è l'incasso" />
      <Card withBorder bg="var(--mantine-color-gray-light)">
        <Group justify="space-between">
          <Text size="sm">Lordo {formatCents(gross)} − costi {formatCents(costs)}</Text>
          <Text fw={700}>Netto {formatCents(net)}</Text>
        </Group>
        <Text size="sm" c={margin >= 0 ? 'teal' : 'red'}>Margine stimato {formatCents(margin)}</Text>
      </Card>
      {tried && net <= 0 && chosen.length > 0 && <Text c="red" size="sm">Il netto della vendita deve essere positivo.</Text>}
      <Group justify="flex-end">
        <Button onClick={submit} loading={create.isPending}>Registra vendita</Button>
      </Group>
    </Stack>
  );
}
