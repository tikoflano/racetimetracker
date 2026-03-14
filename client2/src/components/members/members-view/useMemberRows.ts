import { useMemo } from "react";
import type {
  Organization,
  OrgMember,
  User,
  Championship,
  ChampionshipMember,
  Event,
  EventMember,
} from "@/module_bindings/types";
import type {
  MemberRow,
  MemberRole,
  RoleCounts,
  ScopeChampionship,
  ScopeEvent,
} from "./types";

export interface UseMemberRowsParams {
  activeOrg: Organization | null;
  orgMembers: ReadonlyArray<OrgMember>;
  users: ReadonlyArray<User>;
  championships: ReadonlyArray<Championship>;
  championshipMembers: ReadonlyArray<ChampionshipMember>;
  events: ReadonlyArray<Event>;
  eventMembers: ReadonlyArray<EventMember>;
}

export interface UseMemberRowsResult {
  memberRows: MemberRow[];
  roleCounts: RoleCounts;
  adminCandidates: MemberRow[];
}

const EMPTY_ROLE_COUNTS: RoleCounts = {
  all: 0,
  owner: 0,
  admin: 0,
  manager: 0,
  timekeeper: 0,
};

export function useMemberRows({
  activeOrg,
  orgMembers,
  users,
  championships,
  championshipMembers,
  events,
  eventMembers,
}: UseMemberRowsParams): UseMemberRowsResult {
  return useMemo(() => {
    const orgId = activeOrg?.id ?? null;
    if (!orgId || !activeOrg) {
      return {
        memberRows: [],
        roleCounts: EMPTY_ROLE_COUNTS,
        adminCandidates: [],
      };
    }

    const org = activeOrg;
    const ownerUser = users.find((u: User) => u.id === org.ownerUserId) ?? null;
    const rows: MemberRow[] = [];
    const orgChampionships = championships.filter(
      (c: Championship) => c.orgId === org.id
    );
    const orgEvents = events.filter((e: Event) => e.orgId === org.id);

    const getChampionshipScopes = (userId: bigint): ScopeChampionship[] => {
      return championshipMembers
        .filter(
          (cm: ChampionshipMember) =>
            cm.userId === userId &&
            orgChampionships.some((c: Championship) => c.id === cm.championshipId)
        )
        .map((cm: ChampionshipMember) => {
          const champ = orgChampionships.find(
            (c: Championship) => c.id === cm.championshipId
          );
          return {
            id: cm.id,
            championshipId: cm.championshipId,
            championshipName:
              champ?.name ?? `Championship #${cm.championshipId}`,
            role: cm.role as "manager" | "timekeeper",
          };
        });
    };

    const getEventScopes = (userId: bigint): ScopeEvent[] => {
      return eventMembers
        .filter(
          (em: EventMember) =>
            em.userId === userId &&
            orgEvents.some((e: Event) => e.id === em.eventId)
        )
        .map((em: EventMember) => {
          const evt = orgEvents.find((e: Event) => e.id === em.eventId);
          return {
            id: em.id,
            eventId: em.eventId,
            eventName: evt?.name ?? `Event #${em.eventId}`,
            role: em.role as "manager" | "timekeeper",
          };
        });
    };

    if (org.ownerUserId) {
      rows.push({
        id: `owner-${String(org.id)}-${String(org.ownerUserId)}`,
        name: ownerUser
          ? ownerUser.name || ownerUser.email || `User #${ownerUser.id}`
          : `User #${org.ownerUserId}`,
        email: ownerUser?.email || "",
        status: "active",
        role: "owner",
        userId: org.ownerUserId,
        isPending: false,
        championshipScopes: getChampionshipScopes(org.ownerUserId),
        eventScopes: getEventScopes(org.ownerUserId),
      });
    }

    const seenUserIds = new Set<string>();
    if (org.ownerUserId) seenUserIds.add(String(org.ownerUserId));
    const orgMembersForOrg = orgMembers.filter(
      (m: OrgMember) => m.orgId === org.id
    );

    for (const m of orgMembersForOrg) {
      const userIdKey = String(m.userId);
      if (seenUserIds.has(userIdKey)) continue;
      seenUserIds.add(userIdKey);
      const u = users.find((user: User) => user.id === m.userId) ?? null;
      const isPending = !!u?.googleSub?.startsWith("pending:");
      rows.push({
        id: `member-${String(org.id)}-${String(m.id)}`,
        name: u ? u.name || u.email || `User #${u.id}` : `User #${m.userId}`,
        email: u?.email || "",
        status: isPending ? "pending" : "active",
        role: m.role as MemberRole,
        userId: u?.id,
        orgMemberId: m.id,
        isPending,
        championshipScopes: getChampionshipScopes(m.userId),
        eventScopes: getEventScopes(m.userId),
      });
    }

    const roleCounts: RoleCounts = {
      all: rows.length,
      owner: rows.filter((m) => m.role === "owner").length,
      admin: rows.filter((m) => m.role === "admin").length,
      manager: rows.filter((m) => m.role === "manager").length,
      timekeeper: rows.filter((m) => m.role === "timekeeper").length,
    };

    const adminCandidates = rows.filter(
      (m) => m.role === "admin" && m.status === "active" && m.userId != null
    );

    return { memberRows: rows, roleCounts, adminCandidates };
  }, [
    activeOrg,
    orgMembers,
    users,
    championships,
    championshipMembers,
    events,
    eventMembers,
  ]);
}
