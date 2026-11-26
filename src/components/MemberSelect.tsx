import { Select } from '@mantine/core';
import type { Member } from '../lib/types';

export function MemberSelect({ members, value, onChange, label }: { members: Member[]; value: string | null; onChange: (v: string | null) => void; label: string }) {
  return (
    <Select
      label={label}
      data={members.map((m) => ({ value: m.user_id, label: m.display_name }))}
      value={value}
      onChange={onChange}
      allowDeselect={false}
    />
  );
}
