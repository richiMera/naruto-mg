import { useEffect, useState } from 'react';
import { TextInput, type TextInputProps } from '@mantine/core';
import { parseEuro } from '../lib/money';

type Props = Omit<TextInputProps, 'value' | 'onChange' | 'error'> & {
  value: number | null;
  onChange: (cents: number | null) => void;
  error?: string | null;
};

function centsToText(c: number | null): string {
  if (c == null) return '';
  return (c / 100).toFixed(2).replace('.', ',');
}

/** Campo importo in euro; il valore esposto è in centesimi. */
export function MoneyInput({ value, onChange, error, ...rest }: Props) {
  const [text, setText] = useState(centsToText(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (parseEuro(text) !== value) setText(centsToText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      inputMode="decimal"
      leftSection="€"
      placeholder="0,00"
      {...rest}
      value={text}
      error={error ?? (invalid ? 'Importo non valido' : undefined)}
      onChange={(e) => {
        const t = e.currentTarget.value;
        setText(t);
        const c = parseEuro(t);
        setInvalid(t.trim() !== '' && c == null);
        onChange(c);
      }}
      onBlur={() => {
        const c = parseEuro(text);
        if (c != null) setText(centsToText(c));
      }}
    />
  );
}
