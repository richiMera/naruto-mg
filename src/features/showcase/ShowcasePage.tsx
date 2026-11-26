import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Container, Group, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { IconLock, IconSearch } from '@tabler/icons-react';
import { TcgCard } from '../../components/TcgCard';
import { Brand } from '../../layout/AppLayout';
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

  const sets = new Set((showcase.data ?? []).map((i) => i.set_code).filter(Boolean)).size;

  return (
    <>
      <div className="nm-showcase-head">
        <Container size="lg" py={36}>
          <Group justify="space-between" mb={28}>
            <Brand />
            <Button component={Link} to="/login" variant="default" size="xs" leftSection={<IconLock size={14} />}>Area riservata</Button>
          </Group>
          <div className="nm-label">La nostra collezione</div>
          <Text className="disp" fz={{ base: 40, sm: 56 }} lh={1.05}>Vetrina</Text>
          {showcase.data && (
            <Text c="dimmed" mt={4}>
              {showcase.data.length} pezzi{sets ? ` · ${sets} set` : ''}
            </Text>
          )}
        </Container>
      </div>
      <Container size="lg" pb="xl">
        <Stack>
          <Group wrap="wrap">
            <TextInput leftSection={<IconSearch size={16} />} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.currentTarget.value)} style={{ flex: 1, minWidth: 180 }} />
            <SegmentedControl value={kind} onChange={setKind} data={[{ value: 'all', label: 'Tutto' }, { value: 'card', label: 'Carte' }, { value: 'box', label: 'Box' }, { value: 'sealed', label: 'Sealed' }]} />
          </Group>
          <QueryState query={showcase}>
            {() =>
              filtered.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">Nessun articolo in vetrina.</Text>
              ) : (
                <div className="tcg-grid">
                  {filtered.map((i) => (
                    <TcgCard
                      key={i.item_id}
                      seed={`${i.set_code ?? ''}${i.number ?? ''}${i.name}`}
                      kind={i.kind}
                      title={i.name}
                      subtitle={[i.rarity ?? KIND_LABEL[i.kind], i.condition].filter(Boolean).join(' · ')}
                      rarity={i.rarity}
                      image={photoUrl(i.photo_path) ?? i.image_url}
                      badge={i.grading_company && <Badge size="sm" color="yellow" variant="filled">{i.grading_company} {i.grade}</Badge>}
                      footer={<Text size="xs" c="dimmed">{[i.set_code, i.number && `#${i.number}`, i.language].filter(Boolean).join(' · ')}</Text>}
                    />
                  ))}
                </div>
              )
            }
          </QueryState>
        </Stack>
      </Container>
    </>
  );
}
