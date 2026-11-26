import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AspectRatio, Badge, Card, Center, Container, Group, Image, SegmentedControl, SimpleGrid, Stack, Text, TextInput, Title, Anchor } from '@mantine/core';
import { IconCards, IconSearch } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { supabase, unwrap, photoUrl } from '../../lib/supabase';
import { QueryState } from '../../components/QueryState';
import { KIND_LABEL } from '../../lib/format';

type ShowcaseItem = {
  item_id: string;
  kind: 'box' | 'sealed' | 'card';
  name: string;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  condition: string | null;
  language: string | null;
  grading_company: string | null;
  grade: number | null;
  photo_path: string | null;
  image_url: string | null;
};

export function ShowcasePage() {
  const showcase = useQuery({
    queryKey: ['showcase'],
    queryFn: async () => unwrap(await supabase.rpc('get_showcase')) as ShowcaseItem[],
  });
  const [kind, setKind] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (showcase.data ?? []).filter(
      (i) => (kind === 'all' || i.kind === kind) && (!t || `${i.name} ${i.set_code ?? ''} ${i.number ?? ''} ${i.rarity ?? ''}`.toLowerCase().includes(t)),
    );
  }, [showcase.data, kind, q]);

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group justify="space-between">
          <div>
            <Title order={1}>Vetrina</Title>
            <Text c="dimmed">La nostra collezione</Text>
          </div>
          <Anchor component={Link} to="/login" size="sm">Area riservata</Anchor>
        </Group>
        <Group wrap="wrap">
          <TextInput leftSection={<IconSearch size={16} />} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.currentTarget.value)} style={{ flex: 1, minWidth: 180 }} />
          <SegmentedControl value={kind} onChange={setKind} data={[{ value: 'all', label: 'Tutto' }, { value: 'card', label: 'Carte' }, { value: 'box', label: 'Box' }, { value: 'sealed', label: 'Sealed' }]} />
        </Group>
        <QueryState query={showcase}>
          {() =>
            filtered.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">Nessun articolo in vetrina.</Text>
            ) : (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }}>
                {filtered.map((i) => {
                  const src = photoUrl(i.photo_path) ?? i.image_url;
                  return (
                    <Card key={i.item_id} withBorder padding="xs">
                      <Card.Section>
                        <AspectRatio ratio={63 / 88}>
                          {src ? (
                            <Image src={src} alt={i.name} fit="contain" bg="var(--mantine-color-gray-light)" />
                          ) : (
                            <Center bg="var(--mantine-color-gray-light)" data-testid="placeholder">
                              <IconCards size={48} color="var(--mantine-color-gray-5)" />
                            </Center>
                          )}
                        </AspectRatio>
                      </Card.Section>
                      <Text fw={600} size="sm" mt="xs" lineClamp={2}>{i.name}</Text>
                      <Text size="xs" c="dimmed">
                        {[i.set_code, i.number && `#${i.number}`].filter(Boolean).join(' ')}
                      </Text>
                      <Group gap={4} mt={4}>
                        <Badge size="xs" variant="light">{KIND_LABEL[i.kind]}</Badge>
                        {i.rarity && <Badge size="xs" variant="light" color="grape">{i.rarity}</Badge>}
                        {i.grading_company && <Badge size="xs" variant="light" color="yellow">{i.grading_company} {i.grade}</Badge>}
                      </Group>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )
          }
        </QueryState>
      </Stack>
    </Container>
  );
}
