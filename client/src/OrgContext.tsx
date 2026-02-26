import { createContext, useContext } from 'react';

interface OrgContextValue {
  activeOrgId: bigint | null;
}

const OrgContext = createContext<OrgContextValue>({ activeOrgId: null });

export const OrgProvider = OrgContext.Provider;

export function useActiveOrg(): bigint {
  const { activeOrgId } = useContext(OrgContext);
  if (!activeOrgId) throw new Error('No active organization');
  return activeOrgId;
}

export function useActiveOrgMaybe(): bigint | null {
  return useContext(OrgContext).activeOrgId;
}
