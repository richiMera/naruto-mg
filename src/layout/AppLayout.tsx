import { ActionIcon, AppShell, Avatar, Box, Divider, Group, NavLink, ScrollArea, Text, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavLink as RouterLink, Link, Outlet, useLocation } from 'react-router-dom';
import {
  IconLayoutDashboard, IconCards, IconBook, IconShoppingCart, IconCash, IconCalendarDue,
  IconBuildingStore, IconScale, IconHeart, IconWorld, IconLogout, IconMenu2, IconPlus,
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

const tabs = [
  { to: '/dashboard', label: 'Home', icon: IconLayoutDashboard },
  { to: '/collezione', label: 'Collezione', icon: IconCards },
  { to: '/preordini', label: 'Preordini', icon: IconCalendarDue },
  { to: '/conti', label: 'Conti', icon: IconScale },
];

export function Brand() {
  return (
    <Group gap={10} wrap="nowrap">
      <div className="nm-logo" />
      <Text className="disp" fz={22} lh={1}>Naruto MG</Text>
    </Group>
  );
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { member, signOut } = useAuth();
  const location = useLocation();
  const isActive = (to: string) => location.pathname.startsWith(to);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 230, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
      styles={{
        header: { background: 'rgba(13,14,18,0.85)', backdropFilter: 'blur(10px)' },
        navbar: { background: 'var(--nm-panel)' },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Brand />
          <Group gap="xs">
            <Text size="sm" c="dimmed" visibleFrom="xs">{member?.display_name}</Text>
            <Avatar radius="xl" size={32} variant="gradient" gradient={{ from: 'ember.5', to: 'grape.5', deg: 135 }}>
              {member?.display_name?.[0]?.toUpperCase()}
            </Avatar>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              className="nm-nav"
              component={RouterLink}
              to={l.to}
              label={l.label}
              leftSection={<l.icon size={18} />}
              active={isActive(l.to)}
              variant="subtle"
              color="gray"
              onClick={close}
            />
          ))}
          <Divider my="xs" />
          <NavLink className="nm-nav" component={RouterLink} to="/vetrina" label="Vetrina pubblica" leftSection={<IconWorld size={18} />} onClick={close} />
        </AppShell.Section>
        <AppShell.Section>
          <Button fullWidth variant="subtle" color="gray" leftSection={<IconLogout size={16} />} onClick={signOut}>
            Esci
          </Button>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main className="nm-main">
        <Outlet />
      </AppShell.Main>

      <Box hiddenFrom="sm">
        <ActionIcon className="nm-fab" component={Link} to="/acquisti?nuovo=1" aria-label="Nuovo acquisto" onClick={close}>
          <IconPlus size={28} stroke={2.5} />
        </ActionIcon>
        <nav className="nm-tabbar">
          {tabs.map((t) => (
            <Link key={t.to} to={t.to} className={`nm-tab${isActive(t.to) && !opened ? ' active' : ''}`} onClick={close}>
              <t.icon size={20} />
              {t.label}
            </Link>
          ))}
          <button type="button" className={`nm-tab${opened ? ' active' : ''}`} onClick={toggle}>
            <IconMenu2 size={20} />
            Altro
          </button>
        </nav>
      </Box>
    </AppShell>
  );
}
