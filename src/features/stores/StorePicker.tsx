import { useState } from 'react';
import { ActionIcon, Group, Modal, Select } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useStores } from './api';
import { StoreForm } from './StoreForm';

export function StorePicker({ value, onChange, label = 'Negozio', required, allowEmpty, error }: { value: string | null; onChange: (v: string | null) => void; label?: string; required?: boolean; allowEmpty?: boolean; error?: string }) {
  const stores = useStores();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <Group align="flex-end" gap={6} wrap="nowrap">
        <Select
          style={{ flex: 1 }}
          label={label}
          required={required}
          error={error}
          searchable
          clearable={allowEmpty}
          placeholder={allowEmpty ? 'Nessuno / privato' : 'Scegli…'}
          data={(stores.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
          value={value}
          onChange={onChange}
          nothingFoundMessage="Nessun negozio"
        />
        <ActionIcon variant="light" size="lg" onClick={() => setCreating(true)} aria-label="Nuovo negozio">
          <IconPlus size={16} />
        </ActionIcon>
      </Group>
      <Modal opened={creating} onClose={() => setCreating(false)} title="Nuovo negozio">
        <StoreForm
          onSaved={(s) => {
            onChange(s.id);
            setCreating(false);
          }}
        />
      </Modal>
    </>
  );
}
