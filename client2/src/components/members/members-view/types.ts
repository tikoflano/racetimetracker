/** Member row status for display */
export type MemberStatus = "active" | "pending";

/** Org-level role */
export type MemberRole = "owner" | "admin" | "manager" | "timekeeper";

/** Championship scope for a member */
export interface ScopeChampionship {
  id: bigint;
  championshipId: bigint;
  championshipName: string;
  role: "manager" | "timekeeper";
}

/** Event scope for a member */
export interface ScopeEvent {
  id: bigint;
  eventId: bigint;
  eventName: string;
  role: "manager" | "timekeeper";
}

/** Flattened member row for table/cards */
export interface MemberRow {
  id: string;
  name: string;
  email: string;
  status: MemberStatus;
  role: MemberRole;
  userId?: bigint;
  orgMemberId?: bigint;
  isPending?: boolean;
  championshipScopes: ScopeChampionship[];
  eventScopes: ScopeEvent[];
}

/** Role filter option value */
export type RoleFilter = "all" | "owner" | "admin" | "manager" | "timekeeper";

/** Counts per role for filter badges */
export type RoleCounts = Record<RoleFilter, number>;

/** Reducer signatures for MemberEditModal */
export interface MemberEditModalReducers {
  updateOrgMember: (args: { orgMemberId: bigint; role: string }) => Promise<unknown>;
  addChampionshipMember: (args: {
    championshipId: bigint;
    userId: bigint;
    role: string;
  }) => Promise<unknown>;
  updateChampionshipMember: (args: {
    championshipMemberId: bigint;
    role: string;
  }) => Promise<unknown>;
  removeChampionshipMember: (args: {
    championshipMemberId: bigint;
  }) => Promise<unknown>;
  addEventMember: (args: {
    eventId: bigint;
    userId: bigint;
    role: string;
  }) => Promise<unknown>;
  updateEventMember: (args: {
    eventMemberId: bigint;
    role: string;
  }) => Promise<unknown>;
  removeEventMember: (args: { eventMemberId: bigint }) => Promise<unknown>;
}
