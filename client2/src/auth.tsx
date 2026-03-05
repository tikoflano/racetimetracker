import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useTable, useSpacetimeDB } from 'spacetimedb/react';
import { tables } from './module_bindings';
import type {
  User,
  OrgMember,
  EventMember,
  Organization,
  ImpersonationStatus,
} from './module_bindings/types';

interface AuthState {
  token: string | null;
  login: (idToken: string) => void;
  logout: () => void;
  /** The effective user (impersonated if active, otherwise real) */
  user: User | null;
  /** The real authenticated user (never impersonated) */
  realUser: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isImpersonating: boolean;
  isSuperAdmin: boolean;
  canImpersonate: boolean;
  allUsers: readonly User[];
  // Permission helpers
  isOrgOwner: (orgId: bigint) => boolean;
  getOrgRole: (orgId: bigint) => string | null;
  getEventRole: (eventId: bigint) => string | null;
  canManageOrg: (orgId: bigint) => boolean;
  canManageOrgEvents: (orgId: bigint) => boolean;
  canOrganizeEvent: (eventId: bigint, orgId: bigint) => boolean;
  canTimekeep: (eventId: bigint, orgId: bigint) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const { identity } = useSpacetimeDB();
  const [users] = useTable(tables.user);
  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [eventMembers] = useTable(tables.event_member);
  const [impersonationStatuses] = useTable(tables.impersonation_status);

  const isReady = users.length > 0 || !token;

  // Real user: always resolved from connection identity
  const realUser =
    token && identity ? (users.find((u: User) => u.identity.isEqual(identity)) ?? null) : null;

  // Check for active impersonation via the public status table
  const impersonation = useMemo(() => {
    if (!identity || !realUser) return null;
    return (
      impersonationStatuses.find((s: ImpersonationStatus) => s.adminIdentity.isEqual(identity)) ??
      null
    );
  }, [identity, realUser, impersonationStatuses]);

  // Effective user: impersonated target or real user
  const user = useMemo(() => {
    if (impersonation) {
      return users.find((u: User) => u.id === impersonation.targetUserId) ?? realUser;
    }
    return realUser;
  }, [impersonation, users, realUser]);

  const isImpersonating = impersonation !== null;
  const isSuperAdmin = realUser?.isSuperAdmin ?? false;

  // Check if real user is an org admin (owner or admin role) for any org
  const canImpersonate = useMemo(() => {
    if (!realUser) return false;
    if (realUser.isSuperAdmin) return true;
    // Check if org owner
    for (const o of orgs) {
      if (o.ownerUserId === realUser.id) return true;
    }
    // Check if org admin member
    for (const m of orgMembers) {
      if (m.userId === realUser.id && m.role === 'admin') return true;
    }
    return false;
  }, [realUser, orgs, orgMembers]);

  const login = useCallback((idToken: string) => {
    localStorage.setItem('auth_token', idToken);
    setToken(idToken);
    window.location.reload();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    window.location.reload();
  }, []);

  const isOrgOwner = useCallback(
    (orgId: bigint): boolean => {
      if (!user) return false;
      const org = orgs.find((o: Organization) => o.id === orgId);
      return org?.ownerUserId === user.id;
    },
    [user, orgs]
  );

  // Org owners are implicitly 'admin'
  const getOrgRole = useCallback(
    (orgId: bigint): string | null => {
      if (!user) return null;
      if (user.isSuperAdmin) return 'admin';
      if (isOrgOwner(orgId)) return 'admin';
      const m = orgMembers.find((m: OrgMember) => m.orgId === orgId && m.userId === user.id);
      return m?.role ?? null;
    },
    [user, orgMembers, isOrgOwner]
  );

  const getEventRole = useCallback(
    (eventId: bigint): string | null => {
      if (!user) return null;
      const m = eventMembers.find(
        (m: EventMember) => m.eventId === eventId && m.userId === user.id
      );
      return m?.role ?? null;
    },
    [user, eventMembers]
  );

  const canManageOrg = useCallback(
    (orgId: bigint): boolean => {
      if (!user) return false;
      if (user.isSuperAdmin) return true;
      return getOrgRole(orgId) === 'admin';
    },
    [user, getOrgRole]
  );

  const canManageOrgEvents = useCallback(
    (orgId: bigint): boolean => {
      if (!user) return false;
      if (user.isSuperAdmin) return true;
      const role = getOrgRole(orgId);
      return role === 'admin' || role === 'manager';
    },
    [user, getOrgRole]
  );

  const canOrganizeEvent = useCallback(
    (eventId: bigint, orgId: bigint): boolean => {
      if (!user) return false;
      if (user.isSuperAdmin) return true;
      if (canManageOrgEvents(orgId)) return true;
      return getEventRole(eventId) === 'organizer';
    },
    [user, canManageOrgEvents, getEventRole]
  );

  const canTimekeep = useCallback(
    (eventId: bigint, orgId: bigint): boolean => {
      if (!user) return false;
      if (user.isSuperAdmin) return true;
      const orgRole = getOrgRole(orgId);
      if (orgRole) return true;
      const evtRole = getEventRole(eventId);
      return evtRole === 'organizer' || evtRole === 'timekeeper';
    },
    [user, getOrgRole, getEventRole]
  );

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        user,
        realUser,
        isAuthenticated: !!token && !!user,
        isReady,
        isImpersonating,
        isSuperAdmin,
        canImpersonate,
        allUsers: users,
        isOrgOwner,
        getOrgRole,
        getEventRole,
        canManageOrg,
        canManageOrgEvents,
        canOrganizeEvent,
        canTimekeep,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
