import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { Text } from '@mantine/core';

export function notifyError(err: unknown) {
  notifications.show({ color: 'red', title: 'Errore', message: err instanceof Error ? err.message : String(err) });
}

export function notifyOk(message: string) {
  notifications.show({ color: 'green', message });
}

export function confirmAction(opts: { title: string; message: string; confirm?: string; onConfirm: () => void }) {
  modals.openConfirmModal({
    title: opts.title,
    children: <Text size="sm">{opts.message}</Text>,
    labels: { confirm: opts.confirm ?? 'Elimina', cancel: 'Annulla' },
    confirmProps: { color: 'red' },
    onConfirm: opts.onConfirm,
  });
}
