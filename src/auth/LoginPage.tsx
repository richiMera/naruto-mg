import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Alert, Anchor, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useAuth } from './AuthProvider';
import { supabaseConfigured } from '../lib/supabase';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso non riuscito');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" p="xl" radius="md" w="100%" maw={380}>
        <form onSubmit={submit}>
          <Stack>
            <Title order={2}>Naruto MG</Title>
            <Text c="dimmed" size="sm">
              Accesso riservato ai membri.
            </Text>
            {!supabaseConfigured && (
              <Alert color="red">Configurazione mancante: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</Alert>
            )}
            {error && <Alert color="red">{error}</Alert>}
            <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} autoComplete="email" />
            <PasswordInput label="Password" required value={password} onChange={(e) => setPassword(e.currentTarget.value)} autoComplete="current-password" />
            <Button type="submit" loading={busy}>
              Entra
            </Button>
            <Anchor component={Link} to="/vetrina" size="sm" ta="center">
              Vai alla vetrina pubblica
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
