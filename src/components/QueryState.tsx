import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core';

export function QueryState<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  if (query.isError) {
    return (
      <Alert color="red" title="Impossibile caricare i dati">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">Il server potrebbe essere in pausa o la connessione assente.</Text>
          <Text size="xs" c="dimmed">
            {query.error instanceof Error ? query.error.message : String(query.error)}
          </Text>
          <Button size="xs" variant="light" color="red" onClick={() => query.refetch()}>
            Riprova
          </Button>
        </Stack>
      </Alert>
    );
  }
  return <>{children(query.data as T)}</>;
}
