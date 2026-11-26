import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, member, loading, signOut } = useAuth();
  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!member) {
    return (
      <Center h="100vh" p="md">
        <Stack align="center" gap="sm">
          <Title order={3}>Account non autorizzato</Title>
          <Text c="dimmed" ta="center">
            Hai fatto l'accesso come {session.user.email}, ma questo account non è tra i membri.
          </Text>
          <Button variant="light" onClick={signOut}>
            Esci
          </Button>
        </Stack>
      </Center>
    );
  }
  return <>{children}</>;
}
