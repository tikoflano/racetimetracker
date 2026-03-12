import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { tables } from "@/module_bindings";
import type {
  User,
  OrgMember,
  Organization,
  ImpersonationStatus,
} from "@/module_bindings/types";

interface AuthState {
  token: string | null;
  /** The effective user (impersonated if active, otherwise real) */
  user: User | null;
  /** The real authenticated user (never impersonated) */
  realUser: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isImpersonating: boolean;
  canImpersonate: boolean;
  /** Whether the current user is org owner for the given org */
  isOrgOwner: (orgId: bigint) => boolean;
  /** Org role for the current user (admin, manager, timekeeper, or null) */
  getOrgRole: (orgId: bigint) => string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  );
  const { identity } = useSpacetimeDB();
  const [users] = useTable(tables.user);
  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [impersonationStatuses] = useTable(tables.impersonation_status);

  const isReady = users.length > 0 || !token;

  // Real user: always resolved from connection identity
  const realUser =
    token && identity
      ? (users.find((u: User) => u.identity.isEqual(identity)) ?? null)
      : null;

  // Check for active impersonation via the public status table
  const impersonation = useMemo(() => {
    if (!identity || !realUser) return null;
    return (
      (impersonationStatuses.find((s: ImpersonationStatus) =>
        s.adminIdentity.isEqual(identity)
      ) as ImpersonationStatus | undefined) ?? null
    );
  }, [identity, realUser, impersonationStatuses]);

  // Effective user: impersonated target or real user
  const user = useMemo(() => {
    if (impersonation) {
      return (
        users.find((u: User) => u.id === impersonation.targetUserId) ??
        realUser
      );
    }
    return realUser;
  }, [impersonation, users, realUser]);

  const isImpersonating = impersonation !== null;

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
      if (m.userId === realUser.id && m.role === "admin") return true;
    }
    return false;
  }, [realUser, orgs, orgMembers]);

  const isOrgOwner = useCallback(
    (orgId: bigint): boolean => {
      if (!user) return false;
      const org = orgs.find((o: Organization) => o.id === orgId);
      return org?.ownerUserId === user.id;
    },
    [user, orgs]
  );

  const getOrgRole = useCallback(
    (orgId: bigint): string | null => {
      if (!user) return null;
      if (user.isSuperAdmin) return "admin";
      if (isOrgOwner(orgId)) return "admin";
      const m = orgMembers.find(
        (m: OrgMember) => m.orgId === orgId && m.userId === user.id
      );
      return m?.role ?? null;
    },
    [user, orgMembers, isOrgOwner]
  );

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        realUser,
        isAuthenticated: !!token && !!user,
        isReady,
        isImpersonating,
        canImpersonate,
        isOrgOwner,
        getOrgRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
