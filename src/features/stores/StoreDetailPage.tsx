import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ActionIcon, Anchor, Badge, Button, Card, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { QueryState } from '../../components/QueryState';
import { useStore } from './api';
import { StoreForm } from './StoreForm';
import { PreordersTable } from '../preorders/PreordersPage';
import { PurchasesTable } from '../purchases/PurchasesPage';
import { usePurchases } from '../purchases/api';
import { formatCents } from '../../lib/money';

export function StoreDetailPage() {
  const { id } = useParams();
  const store = useStore(id);
  const purchases = usePurchases(id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const spent = (purchases.data ?? []).reduce((a, p) => a + p.shipping_cents + p.purchase_lines.reduce((b, l) => b + l.price_cents, 0), 0);

  return (
    <QueryState query={store}>
      {(s) => (
        <Stack>
          <Group justify="space-between">
            <Group>
              <ActionIcon variant="subtle" onClick={() => navigate('/negozi')} aria-label="Indietro"><IconArrowLeft /></ActionIcon>
              <div>
                <Group gap="xs">
                  <Title order={2}>{s.name}</Title>
                  <Badge variant="light">{s.kind === 'online' ? 'Online' : 'Fisico'}</Badge>
                </Group>
                <Text c="dimmed" size="sm">
                  {s.city} {s.url && <Anchor href={s.url} target="_blank">{s.url}</Anchor>}
                </Text>
              </div>
            </Group>
            <Button variant="light" onClick={() => setEditing(true)}>Modifica</Button>
          </Group>
          {s.notes && <Text>{s.notes}</Text>}
          <Card withBorder>
            <Text size="sm" c="dimmed">Totale speso qui (acquisti e preordini arrivati)</Text>
            <Text fw={700} size="xl">{formatCents(spent)}</Text>
          </Card>
          <Title order={4}>Preordini</Title>
          <PreordersTable storeId={s.id} status="all" />
          <Title order={4}>Acquisti</Title>
          <PurchasesTable storeId={s.id} />
          <Modal opened={editing} onClose={() => setEditing(false)} title="Modifica negozio">
            <StoreForm initial={s} onSaved={() => setEditing(false)} />
          </Modal>
        </Stack>
      )}
    </QueryState>
  );
}
