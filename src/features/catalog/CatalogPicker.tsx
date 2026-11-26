import { useState } from 'react';
import { Combobox, InputBase, Loader, Modal, Text, useCombobox } from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import type { CatalogCard, CatalogProduct } from '../../lib/types';
import { useCatalogEntry, useCatalogSearch, type CatalogKind } from './api';
import { CardForm, ProductForm } from './CatalogForms';

type Props = {
  kind: CatalogKind;
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
};

export function catalogLabel(e: CatalogCard | CatalogProduct): string {
  if ('number' in e) return `${e.name} · ${e.set_code} #${e.number}${e.variant ? ` (${e.variant})` : ''}${e.rarity ? ` · ${e.rarity}` : ''}`;
  return `${e.name}${e.set_code ? ` · ${e.set_code}` : ''}`;
}

/** Cerca nel catalogo; se non trova nulla permette di creare la voce al volo. */
export function CatalogPicker({ kind, value, onChange, label, required, error }: Props) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 250);
  const results = useCatalogSearch(kind, debounced);
  const selected = useCatalogEntry(kind, value);
  const [creating, { open, close }] = useDisclosure(false);

  const options = (results.data ?? []) as (CatalogCard | CatalogProduct)[];
  const displayed = combobox.dropdownOpened ? search : selected.data ? catalogLabel(selected.data) : '';

  return (
    <>
      <Combobox
        store={combobox}
        onOptionSubmit={(v) => {
          if (v === '__create__') {
            combobox.closeDropdown();
            open();
            return;
          }
          onChange(v);
          setSearch('');
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <InputBase
            label={label ?? (kind === 'card' ? 'Carta' : 'Prodotto')}
            required={required}
            error={error}
            placeholder={kind === 'card' ? 'Cerca per nome, set o numero…' : 'Cerca prodotto…'}
            value={displayed}
            rightSection={results.isFetching ? <Loader size={14} /> : <Combobox.Chevron />}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
          />
        </Combobox.Target>
        <Combobox.Dropdown>
          <Combobox.Options mah={280} style={{ overflowY: 'auto' }}>
            {options.map((o) => (
              <Combobox.Option value={o.id} key={o.id}>
                {catalogLabel(o)}
              </Combobox.Option>
            ))}
            {!results.isFetching && options.length === 0 && !search.trim() && (
              <Combobox.Empty>Catalogo vuoto: scrivi per crearne una</Combobox.Empty>
            )}
            {search.trim() && (
              <Combobox.Option value="__create__">
                <Text size="sm" c="orange.7" fw={600}>
                  + Crea «{search.trim()}»
                </Text>
              </Combobox.Option>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
      <Modal opened={creating} onClose={close} title={kind === 'card' ? 'Nuova carta nel catalogo' : 'Nuovo prodotto nel catalogo'}>
        {kind === 'card' ? (
          <CardForm
            initial={{ name: search.trim() }}
            onSaved={(c) => {
              onChange(c.id);
              setSearch('');
              close();
            }}
          />
        ) : (
          <ProductForm
            initial={{ name: search.trim() }}
            onSaved={(p) => {
              onChange(p.id);
              setSearch('');
              close();
            }}
          />
        )}
      </Modal>
    </>
  );
}
