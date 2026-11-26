import { useMemo, type ReactNode } from 'react';
import { Anchor, Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { QueryState } from '../../components/QueryState';
import { useBalances, useMovements } from '../ledger/api';
import { debtPair } from '../ledger/balanceText';
import { useAuth, useMemberName } from '../../auth/AuthProvider';
import { useItems } from '../items/api';
import { useMarginsBySale } from '../sales/api';
import { usePreorders } from '../preorders/api';
import { formatCents } from '../../lib/money';
import { formatDate } from '../../lib/format';

function Stat({ label, value, hint, hintColor }: { label: string; value: string; hint?: string; hintColor?: string }) {
  return (
    <Card withBorder padding="md">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text className="disp" fz={28} lh={1.15} mt={2}>{value}</Text>
      {hint && <Text size="xs" c={hintColor ?? 'dimmed'}>{hint}</Text>}
    </Card>
  );
}

function BalanceHero() {
  const balances = useBalances();
  const { member } = useAuth();
  const memberName = useMemberName();
  const pair = debtPair(balances.data ?? []);
  const me = member?.user_id;
  let line: ReactNode = 'Siete pari';
  if (pair) {
    const amount = <Text span inherit c="ember.5">{formatCents(pair.amount)}</Text>;
    if (pair.to === me) line = <>{memberName(pair.from)} ti deve {amount}</>;
    else if (pair.from === me) line = <>Devi {amount} a {memberName(pair.to)}</>;
    else line = <>{memberName(pair.from)} deve {amount} a {memberName(pair.to)}</>;
  }
  return (
    <div className="nm-hero">
      <div className="nm-label">Saldo tra voi</div>
      <Text className="disp" fz={{ base: 30, sm: 40 }} lh={1.15} my={4}>
        {balances.isLoading ? '…' : line}
      </Text>
      <Text size="sm" c="dimmed" mb="sm">
        {pair ? 'Registra un rimborso quando vi siete scambiati i soldi.' : 'Nessun debito in sospeso.'}
      </Text>
      <Button component={Link} to="/conti" variant={pair ? 'filled' : 'default'} style={{ position: 'relative', zIndex: 1 }}>
        {pair ? 'Registra rimborso' : 'Vai ai conti'}
      </Button>
    </div>
  );
}

function daysLabel(d: string | null): { text: string; color: string } {
  if (!d) return { text: 'senza data', color: 'gray' };
  const n = dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (n < 0) return { text: 'in ritardo', color: 'red' };
  if (n === 0) return { text: 'oggi', color: 'ember' };
  if (n <= 7) return { text: `tra ${n} gg`, color: 'ember' };
  return { text: formatDate(d), color: 'gray' };
}

export function DashboardPage() {
  const movements = useMovements();
  const items = useItems();
  const margins = useMarginsBySale();
  const preorders = usePreorders();

  const money = useMemo(() => {
    let spent = 0;
    let income = 0;
    const months = new Map<string, { mese: string; Spese: number; Incassi: number }>();
    for (let i = 11; i >= 0; i--) {
      const m = dayjs().subtract(i, 'month');
      months.set(m.format('YYYY-MM'), { mese: m.format('MM/YY'), Spese: 0, Incassi: 0 });
    }
    for (const m of movements.data ?? []) {
      if (m.kind === 'settlement') continue;
      const row = months.get(m.occurred_on.slice(0, 7));
      if (m.kind === 'sale') {
        income += m.amount_cents;
        if (row) row.Incassi += m.amount_cents / 100;
      } else {
        spent += m.amount_cents;
        if (row) row.Spese += m.amount_cents / 100;
      }
    }
    return { spent, income, chart: [...months.values()] };
  }, [movements.data]);

  const collection = useMemo(() => {
    const held = (items.data ?? []).filter((i) => i.status === 'owned' || i.status === 'for_sale');
    const valued = held.filter((i) => i.value_cents != null);
    return {
      count: held.length,
      cost: held.reduce((a, i) => a + (i.cost_cents ?? 0), 0),
      value: valued.reduce((a, i) => a + (i.value_cents ?? 0), 0),
      valuedCount: valued.length,
      valuedCost: valued.reduce((a, i) => a + (i.cost_cents ?? 0), 0),
    };
  }, [items.data]);

  const totalMargin = useMemo(() => [...(margins.data?.values() ?? [])].reduce((a, b) => a + b, 0), [margins.data]);
  const upcoming = useMemo(
    () => (preorders.data ?? []).filter((p) => p.status === 'ordinato' && (!p.expected_on || dayjs(p.expected_on).isBefore(dayjs().add(30, 'day')))),
    [preorders.data],
  );

  const plus = collection.value - collection.valuedCost;
  const plusPct = collection.valuedCost > 0 ? Math.round((plus / collection.valuedCost) * 100) : null;
  const openPreorders = (preorders.data ?? []).filter((p) => p.status === 'ordinato');
  const thisWeek = openPreorders.filter((p) => p.expected_on && dayjs(p.expected_on).isBefore(dayjs().add(8, 'day'))).length;
  const { member } = useAuth();

  return (
    <Stack gap="md">
      <Title order={2}>Ciao {member?.display_name ?? ''}</Title>
      <BalanceHero />
      <QueryState query={items}>
        {() => (
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
            <Stat
              label="Valore collezione"
              value={formatCents(collection.value)}
              hint={plusPct != null ? `${plus >= 0 ? '▲ +' : '▼ '}${plusPct}% sul costo` : `${collection.valuedCount} articoli valutati`}
              hintColor={plusPct != null ? (plus >= 0 ? 'teal.4' : 'red.4') : undefined}
            />
            <Stat label="Speso in totale" value={formatCents(money.spent)} hint={`${collection.count} pezzi in collezione`} />
            <Stat
              label="Incassato"
              value={formatCents(money.income)}
              hint={`margine ${formatCents(totalMargin)}`}
              hintColor={totalMargin > 0 ? 'teal.4' : totalMargin < 0 ? 'red.4' : undefined}
            />
            <Stat
              label="Preordini aperti"
              value={String(openPreorders.length)}
              hint={thisWeek ? `${thisWeek} in arrivo questa settimana` : 'niente questa settimana'}
              hintColor={thisWeek ? 'ember.3' : undefined}
            />
          </SimpleGrid>
        )}
      </QueryState>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
        <Card withBorder className="nm-span2">
          <Title order={4} mb="sm">Spese e incassi per mese</Title>
          <BarChart
            h={240}
            data={money.chart}
            dataKey="mese"
            series={[
              { name: 'Spese', color: 'ember.5' },
              { name: 'Incassi', color: 'teal.5' },
            ]}
            gridAxis="x"
            barProps={{ radius: [4, 4, 0, 0] }}
            valueFormatter={(v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)}
          />
        </Card>
        <Card withBorder>
          <Group justify="space-between" mb="xs">
            <Title order={4}>In arrivo</Title>
            <Anchor component={Link} to="/preordini" size="sm">Tutti</Anchor>
          </Group>
          {upcoming.length === 0 ? (
            <Text c="dimmed" size="sm">Niente in arrivo nei prossimi 30 giorni.</Text>
          ) : (
            <Stack gap={0}>
              {upcoming.map((p, idx) => {
                const d = daysLabel(p.expected_on);
                return (
                  <Group key={p.id} justify="space-between" wrap="nowrap" py={9} style={idx ? { borderTop: '1px solid var(--nm-line)' } : undefined}>
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>{p.description}</Text>
                      <Text size="xs" c="dimmed" truncate>
                        {p.stores?.name}{p.remaining_cents ? ` · da pagare ${formatCents(p.remaining_cents)}` : ''}
                      </Text>
                    </div>
                    <Badge variant="light" color={d.color} style={{ flex: 'none' }}>{d.text}</Badge>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
