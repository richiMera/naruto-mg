import { Group, NumberInput, Stack, Text } from '@mantine/core';
import type { Member } from '../lib/types';
import { sharesTotal, type Share } from '../lib/money';

type Props = {
  members: Member[];
  value: Share[];
  onChange: (s: Share[]) => void;
  label?: string;
};

/** Ripartizione percentuale tra membri. Con due membri, cambiare uno aggiorna l'altro. */
export function SharesInput({ members, value, onChange, label = 'Ripartizione' }: Props) {
  const total = sharesTotal(value);
  const pct = (id: string) => (value.find((s) => s.member_id === id)?.share_bp ?? 0) / 100;

  const set = (id: string, p: number) => {
    const bp = Math.round(Math.min(100, Math.max(0, p)) * 100);
    if (members.length === 2) {
      const other = members.find((m) => m.user_id !== id)!;
      onChange([
        { member_id: id, share_bp: bp },
        { member_id: other.user_id, share_bp: 10000 - bp },
      ]);
    } else {
      onChange(members.map((m) => ({ member_id: m.user_id, share_bp: m.user_id === id ? bp : Math.round(pct(m.user_id) * 100) })));
    }
  };

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Group grow>
        {members.map((m) => (
          <NumberInput
            key={m.user_id}
            label={m.display_name}
            suffix=" %"
            min={0}
            max={100}
            decimalScale={2}
            value={pct(m.user_id)}
            onChange={(v) => set(m.user_id, typeof v === 'number' ? v : Number(v) || 0)}
          />
        ))}
      </Group>
      {total !== 10000 && (
        <Text size="xs" c="red">
          Le quote devono sommare al 100% (ora {total / 100}%).
        </Text>
      )}
    </Stack>
  );
}
