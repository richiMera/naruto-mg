import { AppShell, Burger, Group, NavLink, ScrollArea, Text, Button, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavLink as RouterLink, Outlet, useLocation } from 'react-router-dom';
import {
  IconLayoutDashboard, IconCards, IconBook, IconShoppingCart, IconCash, IconCalendarDue,
  IconBuildingStore, IconScale, IconHeart, IconWorld, IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '../auth/AuthProvider';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  { to: '/collezione', label: 'Collezione', icon: IconCards },
  { to: '/catalogo', label: 'Catalogo', icon: IconBook },
  { to: '/acquisti', label: 'Acquisti', icon: IconShoppingCart },
  { to: '/vendite', label: 'Vendite', icon: IconCash },
  { to: '/preordini', label: 'Preordini', icon: IconCalendarDue },
  { to: '/negozi', label: 'Negozi', icon: IconBuildingStore },
  { to: '/conti', label: 'Conti', icon: IconScale },
  { to: '/wishlist', label: 'Wishlist', icon: IconHeart },
];

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { member, signOut } = useAuth();
  const location = useLocation();

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 230, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={800} c="orange.7">
              Naruto MG
            </Text>
          </Group>
          <Text size="sm" c="dimmed">
            {member?.display_name}
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        <AppShell.Section grow component={ScrollArea}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              component={RouterLink}
              to={l.to}
              label={l.label}
              leftSection={<l.icon size={18} />}
              active={location.pathname.startsWith(l.to)}
              onClick={close}
            />
          ))}
          <Divider my="xs" />
          <NavLink component={RouterLink} to="/vetrina" label="Vetrina pubblica" leftSection={<IconWorld size={18} />} onClick={close} />
        </AppShell.Section>
        <AppShell.Section>
          <Button fullWidth variant="subtle" color="gray" leftSection={<IconLogout size={16} />} onClick={signOut}>
            Esci
          </Button>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
