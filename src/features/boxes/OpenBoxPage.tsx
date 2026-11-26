import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionIcon, Button, Card, Group, NumberInput, Select, Stack, Table, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { CatalogPicker, catalogLabel } from '../catalog/CatalogPicker';
import { useCatalogCards } from '../catalog/api';
import { useItem } from '../items/api';
import { supabase, unwrap } from '../../lib/supabase';
import { invalidateMoney } from '../../lib/invalidate';
import { allocateCents, formatCents } from '../../lib/money';
import { CONDITIONS, LANGUAGES } from '../../lib/format';
import { itemName } from '../../lib/types';
import { notifyError, notifyOk } from '../../lib/notify';

type Pull = { key: number; catalog_card_id: string; condition: string | null; language: string | null; copies: number };
let k = 1;

export function useOpenBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { boxId: string; cards: Omit<Pull, 'key'>[] }) => unwrap(await supabase.rpc('open_box', { p_box_item_id: v.boxId, p_cards: v.cards })),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function OpenBoxPage() {
  const { id } = useParams();
  const box = useItem(id);
  const cards = useCatalogCards();
  const open = useOpenBox();
  const navigate = useNavigate();
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [cardId, setCardId] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>('Near Mint');
  const [language, setLanguage] = useState<string | null>(null);
  const [copies, setCopies] = useState(1);

  const cardMap = new Map((cards.data ?? []).map((c) => [c.id, c]));
  const totalCards = pulls.reduce((a, p) => a + p.copies, 0);

  const add = () => {
    if (!cardId) return;
    setPulls((ps) => [...ps, { key: k++, catalog_card_id: cardId, condition, language, copies }]);
    setCardId(null);
    setCopies(1);
  };

  return (
    <QueryState query={box}>
      {(b) => {
        const cost = b.cost_cents;
        const perCard = cost != null && totalCards > 0 ? allocateCents(cost, Array(totalCards).fill(1)) : [];
        const minC = perCard.length ? Math.min(...perCard) : null;
        const maxC = perCard.length ? Math.max(...perCard) : null;
        const blocked = b.kind !== 'box' || (b.status !== 'owned' && b.status !== 'for_sale');
        return (
          <Stack>
            <Group>
              <ActionIcon variant="subtle" onClick={() => navigate(-1)} aria-label="Indietro"><IconArrowLeft /></ActionIcon>
              <div>
                <Title order={2}>Apri box</Title>
                <Text c="dimmed">{itemName(b)} · costo {formatCents(cost)}</Text>
              </div>
            </Group>
            {blocked ? (
              <Text c="red">La box è già aperta o venduta.</Text>
            ) : (
              <>
                <Card withBorder>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      add();
                    }}
                  >
                    <Stack gap="xs">
                      <CatalogPicker kind="card" value={cardId} onChange={setCardId} label="Carta uscita" />
                      <Group grow align="flex-end">
                        <Select label="Condizione" data={CONDITIONS} value={condition} onChange={setCondition} clearable />
                        <Select label="Lingua" data={LANGUAGES} value={language} onChange={setLanguage} clearable />
                        <NumberInput label="Copie" min={1} value={copies} onChange={(v) => setCopies(Math.max(1, Number(v) || 1))} />
                        <Button type="submit" leftSection={<IconPlus size={16} />} disabled={!cardId}>Aggiungi</Button>
                      </Group>
                    </Stack>
                  </form>
                </Card>
                {pulls.length > 0 && (
                  <Table>
                    <Table.Tbody>
                      {pulls.map((p) => {
                        const c = cardMap.get(p.catalog_card_id);
                        return (
                          <Table.Tr key={p.key}>
                            <Table.Td>{c ? catalogLabel(c) : '…'}</Table.Td>
                            <Table.Td>{p.condition}</Table.Td>
                            <Table.Td>{p.language}</Table.Td>
                            <Table.Td>×{p.copies}</Table.Td>
                            <Table.Td w={40}>
                              <ActionIcon variant="subtle" color="red" onClick={() => setPulls((ps) => ps.filter((x) => x.key !== p.key))}><IconTrash size={14} /></ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                )}
                <Card withBorder bg="var(--mantine-color-gray-light)">
                  <Text>
                    {totalCards} carte · Costo per carta{' '}
                    <b>{minC == null ? '—' : minC === maxC ? formatCents(minC) : `${formatCents(minC)}–${formatCents(maxC)}`}</b>
                  </Text>
                  {cost == null && <Text size="xs" c="dimmed">Questa box non ha un costo registrato: le carte non avranno costo.</Text>}
                </Card>
                <Group justify="flex-end">
                  <Button
                    disabled={pulls.length === 0}
                    loading={open.isPending}
                    onClick={() =>
                      open.mutate(
                        { boxId: b.id, cards: pulls.map(({ key: _k, ...rest }) => rest) },
                        { onSuccess: () => { notifyOk('Box aperta'); navigate(`/collezione/${b.id}`); }, onError: notifyError },
                      )
                    }
                  >
                    Conferma apertura
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        );
      }}
    </QueryState>
  );
}
