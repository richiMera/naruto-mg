import { useMemo } from 'react';
import { Anchor, Card, Group, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { BalanceCards } from '../ledger/LedgerPage';
import { useMovements } from '../ledger/api';
import { useItems } from '../items/api';
import { useMarginsBySale } from '../sales/api';
import { usePreorders } from '../preorders/api';
import { formatCents } from '../../lib/money';
import { formatDate } from '../../lib/format';

function Stat({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <Card withBorder>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text fw={700} size="xl" c={color}>{value}</Text>
      {hint && <Text size="xs" c="dimmed">{hint}</Text>}
    </Card>
  );
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

  const pnl = money.income - money.spent;

  return (
    <Stack>
      <PageHeader title="Dashboard" />
      <BalanceCards />
      <QueryState query={movements}>
        {() => (
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <Stat label="Speso in totale" value={formatCents(money.spent)} />
            <Stat label="Incassato (netto)" value={formatCents(money.income)} />
            <Stat label="Cassa comune" value={formatCents(pnl)} color={pnl >= 0 ? 'teal' : 'red'} hint="incassi − spese" />
            <Stat label="Margine sulle vendite" value={formatCents(totalMargin)} color={totalMargin >= 0 ? 'teal' : 'red'} />
          </SimpleGrid>
        )}
      </QueryState>
      <QueryState query={items}>
        {() => (
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <Stat label="Articoli in collezione" value={String(collection.count)} />
            <Stat label="Costo della collezione" value={formatCents(collection.cost)} />
            <Stat label="Valore stimato" value={formatCents(collection.value)} hint={`${collection.valuedCount} articoli valutati`} />
            <Stat
              label="Plus/minus stimata"
              value={formatCents(collection.value - collection.valuedCost)}
              color={collection.value - collection.valuedCost >= 0 ? 'teal' : 'red'}
              hint="solo articoli valutati"
            />
          </SimpleGrid>
        )}
      </QueryState>
      <Card withBorder>
        <Title order={4} mb="sm">Spese e incassi per mese</Title>
        <BarChart
          h={260}
          data={money.chart}
          dataKey="mese"
          series={[
            { name: 'Spese', color: 'orange.6' },
            { name: 'Incassi', color: 'teal.6' },
          ]}
          valueFormatter={(v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)}
        />
      </Card>
      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={4}>Preordini in arrivo (30 giorni)</Title>
          <Anchor component={Link} to="/preordini" size="sm">Tutti</Anchor>
        </Group>
        {upcoming.length === 0 ? (
          <Text c="dimmed" size="sm">Niente in arrivo.</Text>
        ) : (
          <Table>
            <Table.Tbody>
              {upcoming.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{formatDate(p.expected_on)}</Table.Td>
                  <Table.Td>{p.description}</Table.Td>
                  <Table.Td>{p.stores?.name}</Table.Td>
                  <Table.Td ta="right">da pagare {formatCents(p.remaining_cents)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}
