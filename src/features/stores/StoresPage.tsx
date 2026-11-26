import { useState } from 'react';
import { Anchor, Badge, Button, Card, Group, Modal, SimpleGrid, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { useStores } from './api';
import { StoreForm } from './StoreForm';

export function StoresPage() {
  const stores = useStores();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title="Negozi">
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>Nuovo negozio</Button>
      </PageHeader>
      <QueryState query={stores}>
        {(list) =>
          list.length === 0 ? (
            <Text c="dimmed">Nessun negozio ancora.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {list.map((s) => (
                <Card key={s.id} withBorder component={Link} to={`/negozi/${s.id}`}>
                  <Group justify="space-between">
                    <Text fw={600}>{s.name}</Text>
                    <Badge variant="light" color={s.kind === 'online' ? 'blue' : 'teal'}>{s.kind === 'online' ? 'Online' : 'Fisico'}</Badge>
                  </Group>
                  {s.city && <Text size="sm" c="dimmed">{s.city}</Text>}
                  {s.url && <Anchor size="sm" href={s.url} target="_blank" onClick={(e) => e.stopPropagation()}>{s.url}</Anchor>}
                </Card>
              ))}
            </SimpleGrid>
          )
        }
      </QueryState>
      <Modal opened={creating} onClose={() => setCreating(false)} title="Nuovo negozio">
        <StoreForm onSaved={() => setCreating(false)} />
      </Modal>
    </>
  );
}
