import { useMemo, useState } from 'react';
import { Button, Modal, Table, Tabs, TextInput, Image, Text } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { useCatalogCards, useCatalogProducts } from './api';
import { CardForm, ProductForm } from './CatalogForms';
import type { CatalogCard, CatalogProduct } from '../../lib/types';
import { PRODUCT_TYPE_LABEL } from '../../lib/format';

export function CatalogPage() {
  const [tab, setTab] = useState<string | null>('card');
  const [q, setQ] = useState('');
  const [editCard, setEditCard] = useState<Partial<CatalogCard> | null>(null);
  const [editProduct, setEditProduct] = useState<Partial<CatalogProduct> | null>(null);
  const cards = useCatalogCards();
  const products = useCatalogProducts();
  const term = q.trim().toLowerCase();

  const filteredCards = useMemo(
    () => (cards.data ?? []).filter((c) => !term || `${c.name} ${c.set_code} ${c.number} ${c.rarity ?? ''}`.toLowerCase().includes(term)),
    [cards.data, term],
  );
  const filteredProducts = useMemo(
    () => (products.data ?? []).filter((p) => !term || `${p.name} ${p.set_code ?? ''}`.toLowerCase().includes(term)),
    [products.data, term],
  );

  return (
    <>
      <PageHeader title="Catalogo">
        <Button leftSection={<IconPlus size={16} />} onClick={() => (tab === 'card' ? setEditCard({}) : setEditProduct({}))}>
          {tab === 'card' ? 'Nuova carta' : 'Nuovo prodotto'}
        </Button>
      </PageHeader>
      <TextInput leftSection={<IconSearch size={16} />} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.currentTarget.value)} mb="md" />
      <Tabs value={tab} onChange={setTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="card">Carte</Tabs.Tab>
          <Tabs.Tab value="product">Box e sealed</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="card">
          <QueryState query={cards}>
            {() => (
              <Table.ScrollContainer minWidth={600}>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th />
                      <Table.Th>Nome</Table.Th>
                      <Table.Th>Set</Table.Th>
                      <Table.Th>N.</Table.Th>
                      <Table.Th>Rarità</Table.Th>
                      <Table.Th>Variante</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredCards.map((c) => (
                      <Table.Tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setEditCard(c)}>
                        <Table.Td w={40}>{c.image_url && <Image src={c.image_url} h={36} w="auto" radius="sm" />}</Table.Td>
                        <Table.Td>{c.name}</Table.Td>
                        <Table.Td>{c.set_code}{c.set_name ? ` · ${c.set_name}` : ''}</Table.Td>
                        <Table.Td>{c.number}</Table.Td>
                        <Table.Td>{c.rarity}</Table.Td>
                        <Table.Td>{c.variant}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                {filteredCards.length === 0 && <Text c="dimmed" ta="center" py="lg">Nessuna carta. Il catalogo si riempie mentre registri acquisti e aperture.</Text>}
              </Table.ScrollContainer>
            )}
          </QueryState>
        </Tabs.Panel>
        <Tabs.Panel value="product">
          <QueryState query={products}>
            {() => (
              <Table.ScrollContainer minWidth={500}>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nome</Table.Th>
                      <Table.Th>Tipo</Table.Th>
                      <Table.Th>Set</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredProducts.map((p) => (
                      <Table.Tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setEditProduct(p)}>
                        <Table.Td>{p.name}</Table.Td>
                        <Table.Td>{PRODUCT_TYPE_LABEL[p.product_type]}</Table.Td>
                        <Table.Td>{p.set_code}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                {filteredProducts.length === 0 && <Text c="dimmed" ta="center" py="lg">Nessun prodotto.</Text>}
              </Table.ScrollContainer>
            )}
          </QueryState>
        </Tabs.Panel>
      </Tabs>
      <Modal opened={!!editCard} onClose={() => setEditCard(null)} title={editCard?.id ? 'Modifica carta' : 'Nuova carta'}>
        {editCard && <CardForm initial={editCard} onSaved={() => setEditCard(null)} />}
      </Modal>
      <Modal opened={!!editProduct} onClose={() => setEditProduct(null)} title={editProduct?.id ? 'Modifica prodotto' : 'Nuovo prodotto'}>
        {editProduct && <ProductForm initial={editProduct} onSaved={() => setEditProduct(null)} />}
      </Modal>
    </>
  );
}
