import { Button, Group, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { PRODUCT_TYPE_LABEL } from '../../lib/format';
import type { CatalogCard, CatalogProduct, ProductType } from '../../lib/types';
import { useSaveCatalogCard, useSaveCatalogProduct } from './api';
import { notifyError } from '../../lib/notify';

const nn = (s: string) => (s.trim() === '' ? null : s.trim());

export function CardForm({ initial, onSaved }: { initial?: Partial<CatalogCard>; onSaved: (c: CatalogCard) => void }) {
  const save = useSaveCatalogCard();
  const form = useForm({
    initialValues: {
      game: initial?.game ?? 'Naruto',
      set_code: initial?.set_code ?? '',
      set_name: initial?.set_name ?? '',
      number: initial?.number ?? '',
      name: initial?.name ?? '',
      rarity: initial?.rarity ?? '',
      variant: initial?.variant ?? '',
      image_url: initial?.image_url ?? '',
    },
    validate: {
      name: (v) => (v.trim() ? null : 'Obbligatorio'),
      set_code: (v) => (v.trim() ? null : 'Obbligatorio'),
      number: (v) => (v.trim() ? null : 'Obbligatorio'),
    },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (v) => {
        try {
          const c = await save.mutateAsync({
            id: initial?.id,
            game: v.game.trim() || 'Naruto',
            set_code: v.set_code.trim(),
            set_name: nn(v.set_name),
            number: v.number.trim(),
            name: v.name.trim(),
            rarity: nn(v.rarity),
            variant: v.variant.trim(),
            image_url: nn(v.image_url),
          });
          onSaved(c);
        } catch (e) {
          notifyError(e);
        }
      })}
    >
      <Stack>
        <TextInput label="Nome" required {...form.getInputProps('name')} data-autofocus />
        <Group grow>
          <TextInput label="Codice set" required {...form.getInputProps('set_code')} />
          <TextInput label="Numero" required {...form.getInputProps('number')} />
        </Group>
        <TextInput label="Nome set" {...form.getInputProps('set_name')} />
        <Group grow>
          <TextInput label="Rarità" {...form.getInputProps('rarity')} />
          <TextInput label="Variante" placeholder="es. foil, alt art" {...form.getInputProps('variant')} />
        </Group>
        <Group grow>
          <TextInput label="Gioco" {...form.getInputProps('game')} />
          <TextInput label="URL immagine" {...form.getInputProps('image_url')} />
        </Group>
        <Button type="submit" loading={save.isPending}>
          Salva
        </Button>
      </Stack>
    </form>
  );
}

export function ProductForm({ initial, onSaved }: { initial?: Partial<CatalogProduct>; onSaved: (p: CatalogProduct) => void }) {
  const save = useSaveCatalogProduct();
  const form = useForm({
    initialValues: {
      game: initial?.game ?? 'Naruto',
      name: initial?.name ?? '',
      product_type: (initial?.product_type ?? 'box') as ProductType,
      set_code: initial?.set_code ?? '',
      image_url: initial?.image_url ?? '',
    },
    validate: { name: (v) => (v.trim() ? null : 'Obbligatorio') },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (v) => {
        try {
          const p = await save.mutateAsync({
            id: initial?.id,
            game: v.game.trim() || 'Naruto',
            name: v.name.trim(),
            product_type: v.product_type,
            set_code: nn(v.set_code),
            image_url: nn(v.image_url),
          });
          onSaved(p);
        } catch (e) {
          notifyError(e);
        }
      })}
    >
      <Stack>
        <TextInput label="Nome" required {...form.getInputProps('name')} data-autofocus />
        <Select
          label="Tipo"
          data={Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          allowDeselect={false}
          {...form.getInputProps('product_type')}
        />
        <Group grow>
          <TextInput label="Codice set" {...form.getInputProps('set_code')} />
          <TextInput label="Gioco" {...form.getInputProps('game')} />
        </Group>
        <TextInput label="URL immagine" {...form.getInputProps('image_url')} />
        <Button type="submit" loading={save.isPending}>
          Salva
        </Button>
      </Stack>
    </form>
  );
}
