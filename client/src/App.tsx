import { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import {
  AppShell,
  Burger,
  Group,
  Text,
  Button,
  Menu,
  Avatar,
  Modal,
  Paper,
  Box,
  ScrollArea,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { tables, reducers } from './module_bindings';
import { useAuth } from './auth';
import { OrgProvider } from './OrgContext';
import LoginButton from './components/LoginButton';
import Sidebar from './components/Sidebar';
import { EventViewSkeleton } from './components/Skeleton';
import EventView from './views/EventView';
import TrackView from './views/TrackView';
import OrgMembersView from './views/OrgMembersView';
import ChampionshipsView from './views/ChampionshipsView';
import ChampionshipDetailView from './views/ChampionshipDetailView';
import CalendarView from './views/CalendarView';
import RidersView from './views/RidersView';
import LocationsView from './views/LocationsView';
import LocationDetailView from './views/LocationDetailView';
import EventManageView from './views/EventManageView';
import RegisterView from './views/RegisterView';
import QRCodeView from './views/QRCodeView';
import TimekeepView from './views/TimekeepView';
import LeaderboardView from './views/LeaderboardView';
import DevView from './views/DevView';
import { IconLogout, IconArrowLeftRight } from './icons';
import type { Organization } from './module_bindings/types';

const ACTIVE_ORG_KEY = 'active_org_id';

export default function App() {
  const connState = useSpacetimeDB();
  const { user, realUser, isAuthenticated, isImpersonating, logout, getOrgRole, isOrgOwner } =
    useAuth();
  const [orgs] = useTable(tables.organization);
  const stopImpersonation = useReducer(reducers.stopImpersonation);

  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [switchOrgOpen, setSwitchOrgOpen] = useState(false);
  const location = useLocation();
  const isRegistrationPage = location.pathname.startsWith('/register');
  const isLeaderboardPage = location.pathname.includes('/leaderboard');

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const [activeOrgId, setActiveOrgIdRaw] = useState<bigint | null>(() => {
    const stored = localStorage.getItem(ACTIVE_ORG_KEY);
    return stored ? BigInt(stored) : null;
  });

  const setActiveOrgId = useCallback((id: bigint) => {
    localStorage.setItem(ACTIVE_ORG_KEY, String(id));
    setActiveOrgIdRaw(id);
  }, []);

  const userOrgs = useMemo(() => {
    if (!isAuthenticated) return [];
    return orgs.filter((o: Organization) => getOrgRole(o.id) !== null);
  }, [isAuthenticated, orgs, getOrgRole]);

  useEffect(() => {
    if (userOrgs.length === 0) return;
    if (activeOrgId && userOrgs.some((o: Organization) => o.id === activeOrgId)) return;
    setActiveOrgId(userOrgs[0].id);
  }, [userOrgs, activeOrgId, setActiveOrgId]);

  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return userOrgs.find((o: Organization) => o.id === activeOrgId) ?? null;
  }, [activeOrgId, userOrgs]);

  const isConnected = connState.isActive;
  const showSkeleton = !timedOut && !isConnected;
  const showNavbar = isAuthenticated && !isRegistrationPage && !isLeaderboardPage;

  const toggleCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  if (showSkeleton) {
    return (
      <Box maw={1200} mx="auto">
      <AppShell header={{ height: 48 }} padding="lg">
        <AppShell.Header>
          <Group justify="space-between" px="md" h="100%">
            <Text fw={600} size="sm">
              RaceTimeTracker
            </Text>
            <Text size="xs" c="dimmed">
              Connecting...
            </Text>
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <EventViewSkeleton />
        </AppShell.Main>
      </AppShell>
      </Box>
    );
  }

  return (
    <Box maw={1200} mx="auto">
    <AppShell
      header={{ height: 48 }}
      navbar={
        showNavbar
          ? {
              width: sidebarCollapsed ? 48 : 220,
              breakpoint: 'sm',
              collapsed: { mobile: !mobileOpened, desktop: false },
            }
          : undefined
      }
      padding="lg"
    >
      {isAuthenticated && !isRegistrationPage && (
        <AppShell.Header>
          <Group justify="space-between" px="md" h="100%">
            <Group gap="xs">
              {showNavbar && (
                <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
              )}
              <Text fw={600} size="sm">
                RaceTimeTracker
              </Text>
              {activeOrg && (
                <>
                  <Text size="sm" c="dimmed">
                    /
                  </Text>
                  <Text size="sm" opacity={0.8}>
                    {activeOrg.name}
                  </Text>
                </>
              )}
            </Group>
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <Avatar
                  src={user?.picture}
                  radius="xl"
                  color="blue"
                  style={{ cursor: 'pointer' }}
                >
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="sm" fw={600}>
                    {user?.name || 'User'}
                  </Text>
                  {user?.email && (
                    <Text size="xs" c="dimmed">
                      {user.email}
                    </Text>
                  )}
                </Menu.Label>
                {userOrgs.length > 1 && (
                  <Menu.Item
                    leftSection={<IconArrowLeftRight size={16} />}
                    onClick={() => setSwitchOrgOpen(true)}
                  >
                    Switch organization
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  color="red"
                  onClick={() => logout()}
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </AppShell.Header>
      )}

      {showNavbar && (
        <AppShell.Navbar>
          <AppShell.Section grow component={ScrollArea}>
            <Sidebar
              activeOrg={activeOrg}
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleCollapse}
            />
          </AppShell.Section>
        </AppShell.Navbar>
      )}

      <Modal
        opened={switchOrgOpen}
        onClose={() => setSwitchOrgOpen(false)}
        title="Switch Organization"
      >
        <Stack gap="xs">
          {userOrgs.map((o: Organization) => {
            const isActive = activeOrg?.id === o.id;
            const role = isOrgOwner(o.id) ? 'owner' : getOrgRole(o.id);
            return (
              <Button
                key={String(o.id)}
                variant={isActive ? 'light' : 'default'}
                fullWidth
                justify="space-between"
                onClick={() => {
                  setActiveOrgId(o.id);
                  setSwitchOrgOpen(false);
                }}
              >
                <Text fw={isActive ? 600 : 400}>{o.name}</Text>
                {role && (
                  <Text size="xs" component="span">
                    {role}
                  </Text>
                )}
              </Button>
            );
          })}
        </Stack>
      </Modal>

      {isImpersonating && user && realUser && (
        <Box
          style={{
            background: 'var(--mantine-color-orange-6)',
            color: 'white',
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text size="sm">
            Viewing as: <strong>{user.name || user.email}</strong>
          </Text>
          <Button
            variant="white"
            color="dark"
            size="xs"
            onClick={() => stopImpersonation()}
          >
            Stop
          </Button>
        </Box>
      )}

      <AppShell.Main>
        {!isConnected ? (
          <Paper withBorder p="xl" style={{ textAlign: 'center' }}>
            <Text mb="xs">Unable to connect to the server.</Text>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </Paper>
        ) : (
          <OrgProvider value={{ activeOrgId: activeOrgId }}>
            <Routes>
              <Route path="/" element={isAuthenticated ? <AuthRedirect /> : <HomePage />} />
              <Route path="/event/:eventSlug" element={<EventView />} />
              <Route path="/event/:eventSlug/manage" element={<EventManageView />} />
              <Route path="/event/:eventSlug/track/:eventTrackId" element={<TrackView />} />
              <Route path="/event/:eventSlug/leaderboard" element={<LeaderboardView />} />
              <Route path="/:orgSlug/event/:eventSlug" element={<EventView />} />
              <Route
                path="/:orgSlug/event/:eventSlug/leaderboard"
                element={<LeaderboardView />}
              />
              <Route path="/members" element={<OrgMembersView />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/championships" element={<ChampionshipsView />} />
              <Route path="/championship/:champId" element={<ChampionshipDetailView />} />
              <Route path="/riders" element={<RidersView />} />
              <Route path="/locations" element={<LocationsView />} />
              <Route path="/location/:venueId" element={<LocationDetailView />} />
              <Route path="/timekeep" element={<TimekeepView />} />
              <Route path="/register/:orgSlug" element={<RegisterView />} />
              <Route path="/register/:orgSlug/qr" element={<QRCodeView />} />
              <Route path="/dev" element={<DevView />} />
              <Route
                path="*"
                element={isAuthenticated ? <NotFound /> : <Navigate to="/" replace />}
              />
            </Routes>
          </OrgProvider>
        )}
      </AppShell.Main>
    </AppShell>
    </Box>
  );
}

function HomePage() {
  return (
    <Box style={{ textAlign: 'center', padding: '80px 20px', maxWidth: 480, margin: '0 auto' }}>
      <Text size="2.5rem" fw={700} mb="xs">
        RaceTimeTracker
      </Text>
      <Text c="dimmed" mb="xl" size="md">
        Real-time enduro bike race timing. Start and stop timers across the course — everyone sees
        results instantly.
      </Text>
      <Group justify="center" mb="lg">
        <LoginButton />
      </Group>
      <Text c="dimmed" size="sm">
        Sign in with Google to create events, manage riders, and run races.
      </Text>
    </Box>
  );
}

function AuthRedirect() {
  const redirect = localStorage.getItem('redirect_after_login');
  if (redirect) {
    localStorage.removeItem('redirect_after_login');
    return <Navigate to={redirect} replace />;
  }
  return <Navigate to="/championships" replace />;
}

function NotFound() {
  return (
    <Box style={{ textAlign: 'center', padding: '80px 20px' }}>
      <Text size="4rem" fw={700} opacity={0.2} mb="xs">
        404
      </Text>
      <Text size="lg" fw={600} mb="xs">
        Page not found
      </Text>
      <Text c="dimmed" mb="lg">
        The page you're looking for doesn't exist.
      </Text>
      <Button component="a" href="/">
        Go home
      </Button>
    </Box>
  );
}
