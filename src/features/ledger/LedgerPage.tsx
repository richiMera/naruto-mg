import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Card, Group, Modal, Select, SimpleGrid, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDownload, IconPlus, IconTrash, IconArrowsExchange } from '@tabler/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { MoneyInput } from '../../components/MoneyInput';
import { SharesInput } from '../../components/SharesInput';
import { MemberSelect } from '../../components/MemberSelect';
import { useAuth, useMemberName } from '../../auth/AuthProvider';
import { useBalances, useCreateExpense, useDeleteMovement, useMovements, useRecordSettlement } from './api';
import { balanceText, debtPair } from './balanceText';
import { formatCents, sharesTotal, splitEqual, type Share } from '../../lib/money';
import { MOVEMENT_LABEL, formatDate, toIsoDate } from '../../lib/format';
import { centsForCsv, downloadCsv, toCsv } from '../../lib/csv';
import { confirmAction, notifyError, notifyOk } from '../../lib/notify';
import type { Movement } from '../../lib/types';

function ExpenseForm({ onDone }: { onDone: () => void }) {
  const { member, members } = useAuth();
  const create = useCreateExpense();
  const [amount, setAmount] = useState<number | null>(null);
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [paidBy, setPaidBy] = useState<string | null>(member?.user_id ?? null);
  const [shares, setShares] = useState<Share[]>(splitEqual(members.map((m) => m.user_id)));
  const valid = amount != null && amount > 0 && !!paidBy && sharesTotal(shares) === 10000 && desc.trim() !== '';
  return (
    <Stack>
      <TextInput label="Descrizione" required placeholder="es. bustine protettive, binder…" value={desc} onChange={(e) => setDesc(e.currentTarget.value)} data-autofocus />
      <MoneyInput label="Importo" required value={amount} onChange={setAmount} />
      <DateInput label="Data" value={date} onChange={(d) => setDate(d as Date | null)} valueFormat="DD/MM/YYYY" />
      <MemberSelect label="Pagato da" members={members} value={paidBy} onChange={setPaidBy} />
      <SharesInput members={members} value={shares} onChange={setShares} label="Di chi è la spesa" />
      <Button
        disabled={!valid}
        loading={create.isPending}
        onClick={() =>
          create.mutate(
            { amount_cents: amount!, member_id: paidBy!, occurred_on: toIsoDate(date ?? new Date())!, description: desc.trim(), shares },
            { onSuccess: () => { notifyOk('Spesa registrata'); onDone(); }, onError: notifyError },
          )
        }
      >
        Registra spesa
      </Button>
    </Stack>
  );
}

function SettlementForm({ initial, onDone }: { initial: { from: string; to: string; amount: number } | null; onDone: () => void }) {
  const { members } = useAuth();
  const rec = useRecordSettlement();
  const [from, setFrom] = useState<string | null>(initial?.from ?? members[0]?.user_id ?? null);
  const [to, setTo] = useState<string | null>(initial?.to ?? members[1]?.user_id ?? null);
  const [amount, setAmount] = useState<number | null>(initial?.amount ?? null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [desc, setDesc] = useState('');
  const valid = !!from && !!to && from !== to && amount != null && amount > 0;
  return (
    <Stack>
      <Group grow>
        <MemberSelect label="Chi paga" members={members} value={from} onChange={setFrom} />
        <MemberSelect label="A chi" members={members} value={to} onChange={setTo} />
      </Group>
      {from === to && <Text size="sm" c="red">Scegli due persone diverse.</Text>}
      <MoneyInput label="Importo" value={amount} onChange={setAmount} required />
      <DateInput label="Data" value={date} onChange={(d) => setDate(d as Date | null)} valueFormat="DD/MM/YYYY" />
      <TextInput label="Note" placeholder="es. bonifico, contanti" value={desc} onChange={(e) => setDesc(e.currentTarget.value)} />
      <Button
        disabled={!valid}
        loading={rec.isPending}
        onClick={() =>
          rec.mutate(
            { from: from!, to: to!, amount_cents: amount!, occurred_on: toIsoDate(date ?? new Date())!, description: desc.trim() || null },
            { onSuccess: () => { notifyOk('Rimborso registrato'); onDone(); }, onError: notifyError },
          )
        }
      >
        Registra rimborso
      </Button>
    </Stack>
  );
}

export function BalanceCards() {
  const balances = useBalances();
  return (
    <QueryState query={balances}>
      {(b) => (
        <Stack gap="sm">
          <Card withBorder padding="lg">
            <Text size="sm" c="dimmed">Saldo</Text>
            <Title order={2}>{balanceText(b)}</Title>
          </Card>
          <SimpleGrid cols={{ base: 1, sm: b.length }}>
            {b.map((m) => (
              <Card withBorder key={m.member_id}>
                <Text fw={600}>{m.display_name}</Text>
                <Text size="sm">Ha pagato {formatCents(m.paid_cents)} · sua quota spese {formatCents(m.expense_share_cents)}</Text>
                <Text size="sm">Ha incassato {formatCents(m.received_cents)} · sua quota incassi {formatCents(m.income_share_cents)}</Text>
                <Text size="sm">Rimborsi dati {formatCents(m.settled_out_cents)} · ricevuti {formatCents(m.settled_in_cents)}</Text>
                <Text fw={700} c={m.balance_cents >= 0 ? 'teal' : 'red'} mt={4}>
                  {m.balance_cents >= 0 ? 'Deve ricevere' : 'Deve dare'} {formatCents(Math.abs(m.balance_cents))}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </QueryState>
  );
}

export function LedgerPage() {
  const movements = useMovements();
  const balances = useBalances();
  const del = useDeleteMovement();
  const memberName = useMemberName();
  const { members } = useAuth();
  const [expense, setExpense] = useState(false);
  const [settle, setSettle] = useState(false);
  const [kind, setKind] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);

  const filtered = useMemo(
    () => (movements.data ?? []).filter((m) => (!kind || m.kind === kind) && (!who || m.member_id === who || m.counterpart_member_id === who)),
    [movements.data, kind, who],
  );

  const describe = (m: Movement) => {
    if (m.kind === 'settlement') return `${memberName(m.member_id)} → ${memberName(m.counterpart_member_id)}`;
    return m.movement_shares
      .slice()
      .sort((a, b) => a.member_id.localeCompare(b.member_id))
      .map((s) => `${memberName(s.member_id)} ${s.share_bp / 100}%`)
      .join(' / ');
  };

  const exportCsv = () =>
    downloadCsv(
      'movimenti.csv',
      toCsv(filtered, [
        { key: 'occurred_on', label: 'Data' },
        { key: 'kind', label: 'Tipo', format: (r) => MOVEMENT_LABEL[r.kind] },
        { key: 'description', label: 'Descrizione' },
        { key: 'member_id', label: 'Chi', format: (r) => memberName(r.member_id) },
        { key: 'amount_cents', label: 'Importo €', format: (r) => centsForCsv(r.amount_cents) },
        { key: 'movement_shares', label: 'Ripartizione', format: describe },
      ]),
    );

  return (
    <>
      <PageHeader title="Conti">
        <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => setExpense(true)}>Nuova spesa</Button>
        <Button leftSection={<IconArrowsExchange size={16} />} onClick={() => setSettle(true)}>Registra rimborso</Button>
      </PageHeader>
      <BalanceCards />
      <Group mt="xl" mb="sm" justify="space-between">
        <Title order={4}>Movimenti</Title>
        <Group>
          <Select placeholder="Tipo" clearable w={180} value={kind} onChange={setKind} data={Object.entries(MOVEMENT_LABEL).map(([value, label]) => ({ value, label }))} />
          <Select placeholder="Persona" clearable w={150} value={who} onChange={setWho} data={members.map((m) => ({ value: m.user_id, label: m.display_name }))} />
          <ActionIcon variant="light" size="lg" onClick={exportCsv} aria-label="Esporta CSV"><IconDownload size={16} /></ActionIcon>
        </Group>
      </Group>
      <QueryState query={movements}>
        {() => (
          <Table.ScrollContainer minWidth={680}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Descrizione</Table.Th>
                  <Table.Th>Chi</Table.Th>
                  <Table.Th>Ripartizione</Table.Th>
                  <Table.Th ta="right">Importo</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td>{formatDate(m.occurred_on)}</Table.Td>
                    <Table.Td><Badge variant="light" color={m.kind === 'sale' ? 'teal' : m.kind === 'settlement' ? 'grape' : 'blue'}>{MOVEMENT_LABEL[m.kind]}</Badge></Table.Td>
                    <Table.Td>{m.description}</Table.Td>
                    <Table.Td>{memberName(m.member_id)}</Table.Td>
                    <Table.Td>{describe(m)}</Table.Td>
                    <Table.Td ta="right" c={m.kind === 'sale' ? 'teal' : undefined}>{m.kind === 'sale' ? '+' : ''}{formatCents(m.amount_cents)}</Table.Td>
                    <Table.Td w={40}>
                      {['expense', 'preorder_payment', 'settlement'].includes(m.kind) && (
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label="Elimina movimento"
                          onClick={() => confirmAction({ title: 'Eliminare il movimento?', message: 'Il saldo verrà ricalcolato.', onConfirm: () => del.mutate(m.id, { onError: notifyError }) })}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {filtered.length === 0 && <Text c="dimmed" ta="center" py="lg">Nessun movimento.</Text>}
          </Table.ScrollContainer>
        )}
      </QueryState>
      <Modal opened={expense} onClose={() => setExpense(false)} title="Nuova spesa">
        {expense && <ExpenseForm onDone={() => setExpense(false)} />}
      </Modal>
      <Modal opened={settle} onClose={() => setSettle(false)} title="Registra rimborso">
        {settle && <SettlementForm initial={debtPair(balances.data ?? [])} onDone={() => setSettle(false)} />}
      </Modal>
    </>
  );
}
