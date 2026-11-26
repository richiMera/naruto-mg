import { Button, SegmentedControl, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Store } from '../../lib/types';
import { useSaveStore } from './api';
import { notifyError } from '../../lib/notify';

const nn = (s: string) => (s.trim() === '' ? null : s.trim());

export function StoreForm({ initial, onSaved }: { initial?: Partial<Store>; onSaved: (s: Store) => void }) {
  const save = useSaveStore();
  const form = useForm({
    initialValues: {
      name: initial?.name ?? '',
      kind: initial?.kind ?? 'online',
      url: initial?.url ?? '',
      city: initial?.city ?? '',
      notes: initial?.notes ?? '',
    },
    validate: { name: (v) => (v.trim() ? null : 'Obbligatorio') },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (v) => {
        try {
          onSaved(await save.mutateAsync({ id: initial?.id, name: v.name.trim(), kind: v.kind as Store['kind'], url: nn(v.url), city: nn(v.city), notes: nn(v.notes) }));
        } catch (e) {
          notifyError(e);
        }
      })}
    >
      <Stack>
        <TextInput label="Nome" required data-autofocus {...form.getInputProps('name')} />
        <SegmentedControl data={[{ value: 'online', label: 'Online' }, { value: 'fisico', label: 'Fisico' }]} {...form.getInputProps('kind')} />
        <TextInput label="Sito" placeholder="https://…" {...form.getInputProps('url')} />
        <TextInput label="Città" {...form.getInputProps('city')} />
        <Textarea label="Note" autosize minRows={2} {...form.getInputProps('notes')} />
        <Button type="submit" loading={save.isPending}>Salva</Button>
      </Stack>
    </form>
  );
}
