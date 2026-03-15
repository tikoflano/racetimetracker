import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '@/module_bindings';
import type { Organization } from '@/module_bindings/types';
import { useAuth } from '@/auth';

export const ACTIVE_ORG_KEY = 'active_org_id';

interface OrgContextValue {
  activeOrgId: bigint | null;
  setActiveOrgId: (id: bigint) => void;
}

const OrgContext = createContext<OrgContextValue>({
  activeOrgId: null,
  setActiveOrgId: () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { getOrgRole, isAuthenticated } = useAuth();
  const [orgs] = useTable(tables.organization);

  const [activeOrgId, setActiveOrgIdRaw] = useState<bigint | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(ACTIVE_ORG_KEY);
      return stored ? BigInt(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveOrgId = useCallback((id: bigint) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_ORG_KEY, String(id));
    }
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

  const value = useMemo<OrgContextValue>(
    () => ({ activeOrgId, setActiveOrgId }),
    [activeOrgId, setActiveOrgId]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useActiveOrg(): bigint {
  const { activeOrgId } = useContext(OrgContext);
  if (!activeOrgId) throw new Error('No active organization');
  return activeOrgId;
}

export function useActiveOrgMaybe(): bigint | null {
  return useContext(OrgContext).activeOrgId;
}

export function useActiveOrgFromOrgs(orgs: readonly Organization[]): Organization | null {
  const activeOrgId = useActiveOrgMaybe();
  return useMemo(() => {
    if (orgs.length === 0) return null;
    if (activeOrgId) {
      return orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;
    }
    return orgs[0] ?? null;
  }, [orgs, activeOrgId]);
}
