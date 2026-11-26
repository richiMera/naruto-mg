import { useState } from 'react';
import { Button, Stack, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { MoneyInput } from '../../components/MoneyInput';
import { SharesInput } from '../../components/SharesInput';
import { MemberSelect } from '../../components/MemberSelect';
import { useAuth } from '../../auth/AuthProvider';
import { sharesTotal, splitEqual, type Share } from '../../lib/money';
import { toIsoDate } from '../../lib/format';
import { useAddPreorderPayment, type PreorderRow } from './api';
import { notifyError, notifyOk } from '../../lib/notify';

export function PaymentForm({ preorder, onDone }: { preorder: PreorderRow; onDone: () => void }) {
  const { member, members } = useAuth();
  const add = useAddPreorderPayment();
  const [amount, setAmount] = useState<number | null>(preorder.remaining_cents > 0 ? preorder.remaining_cents : null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [paidBy, setPaidBy] = useState<string | null>(member?.user_id ?? null);
  const [shares, setShares] = useState<Share[]>(splitEqual(members.map((m) => m.user_id)));
  const [desc, setDesc] = useState(preorder.paid_cents === 0 ? 'Acconto' : 'Saldo');

  const valid = amount != null && amount > 0 && !!paidBy && sharesTotal(shares) === 10000;

  return (
    <Stack>
      <MoneyInput label="Importo" value={amount} onChange={setAmount} required />
      <TextInput label="Descrizione" value={desc} onChange={(e) => setDesc(e.currentTarget.value)} />
      <DateInput label="Data" value={date} onChange={(d) => setDate(d as Date | null)} valueFormat="DD/MM/YYYY" />
      <MemberSelect label="Pagato da" members={members} value={paidBy} onChange={setPaidBy} />
      <SharesInput members={members} value={shares} onChange={setShares} label="Di chi è la spesa" />
      <Button
        disabled={!valid}
        loading={add.isPending}
        onClick={() =>
          add.mutate(
            { preorder_id: preorder.id, amount_cents: amount!, member_id: paidBy!, occurred_on: toIsoDate(date ?? new Date())!, description: desc.trim() || null, shares },
            { onSuccess: () => { notifyOk('Pagamento registrato'); onDone(); }, onError: notifyError },
          )
        }
      >
        Registra pagamento
      </Button>
    </Stack>
  );
}
