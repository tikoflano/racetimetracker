import { useState, useCallback } from 'react';
import type { Championship, Event } from '@/module_bindings/types';
import type { MemberRow, ScopeChampionship, ScopeEvent } from '../../types';
import type { MemberEditModalReducers } from '../../types';
import { getErrorMessage } from '@/utils';

export interface UseMemberEditFormParams {
  member: MemberRow;
  championships: Championship[];
  events: Event[];
  onClose: () => void;
  reducers: MemberEditModalReducers;
}

export function useMemberEditForm({
  member,
  championships,
  events,
  onClose,
  reducers,
}: UseMemberEditFormParams) {
  const [role, setRole] = useState<'admin' | 'manager' | 'timekeeper'>(
    member.role === 'owner' ? 'admin' : (member.role as 'admin' | 'manager' | 'timekeeper')
  );
  const [addChampId, setAddChampId] = useState<string | null>(null);
  const [addChampRole, setAddChampRole] = useState<'manager' | 'timekeeper'>('manager');
  const [addEventId, setAddEventId] = useState<string | null>(null);
  const [addEventRole, setAddEventRole] = useState<'manager' | 'timekeeper'>('manager');
  const [loading, setLoading] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const availableChampionships = championships.filter(
    (c) => !member.championshipScopes.some((s) => s.championshipId === c.id)
  );
  const availableEvents = events.filter((e) => !member.eventScopes.some((s) => s.eventId === e.id));

  const handleSaveRole = useCallback(async () => {
    if (member.role === 'owner' || !member.orgMemberId) return;
    if (role === member.role) return;
    setLoading(true);
    setScopeError(null);
    try {
      await reducers.updateOrgMember({
        orgMemberId: member.orgMemberId,
        role,
      });
      onClose();
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to update role'));
    } finally {
      setLoading(false);
    }
  }, [member, role, onClose, reducers]);

  const handleAddChampionship = useCallback(async () => {
    if (!addChampId || !member.userId) return;
    setLoading(true);
    setScopeError(null);
    try {
      await reducers.addChampionshipMember({
        championshipId: BigInt(addChampId),
        userId: member.userId,
        role: addChampRole,
      });
      setAddChampId(null);
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to add championship scope'));
    } finally {
      setLoading(false);
    }
  }, [addChampId, addChampRole, member.userId, reducers]);

  const handleAddEvent = useCallback(async () => {
    if (!addEventId || !member.userId) return;
    setLoading(true);
    setScopeError(null);
    try {
      await reducers.addEventMember({
        eventId: BigInt(addEventId),
        userId: member.userId,
        role: addEventRole,
      });
      setAddEventId(null);
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to add event scope'));
    } finally {
      setLoading(false);
    }
  }, [addEventId, addEventRole, member.userId, reducers]);

  const handleRemoveChampionship = useCallback(
    async (scope: ScopeChampionship) => {
      setLoading(true);
      setScopeError(null);
      try {
        await reducers.removeChampionshipMember({
          championshipMemberId: scope.id,
        });
      } catch (e: unknown) {
        setScopeError(getErrorMessage(e, 'Failed to remove championship scope'));
      } finally {
        setLoading(false);
      }
    },
    [reducers]
  );

  const handleRemoveEvent = useCallback(
    async (scope: ScopeEvent) => {
      setLoading(true);
      setScopeError(null);
      try {
        await reducers.removeEventMember({ eventMemberId: scope.id });
      } catch (e: unknown) {
        setScopeError(getErrorMessage(e, 'Failed to remove event scope'));
      } finally {
        setLoading(false);
      }
    },
    [reducers]
  );

  const handleUpdateChampionshipRole = useCallback(
    async (scope: ScopeChampionship, newRole: 'manager' | 'timekeeper') => {
      if (scope.role === newRole) return;
      setLoading(true);
      setScopeError(null);
      try {
        await reducers.updateChampionshipMember({
          championshipMemberId: scope.id,
          role: newRole,
        });
      } catch (e: unknown) {
        setScopeError(getErrorMessage(e, 'Failed to update championship role'));
      } finally {
        setLoading(false);
      }
    },
    [reducers]
  );

  const handleUpdateEventRole = useCallback(
    async (scope: ScopeEvent, newRole: 'manager' | 'timekeeper') => {
      if (scope.role === newRole) return;
      setLoading(true);
      setScopeError(null);
      try {
        await reducers.updateEventMember({
          eventMemberId: scope.id,
          role: newRole,
        });
      } catch (e: unknown) {
        setScopeError(getErrorMessage(e, 'Failed to update event role'));
      } finally {
        setLoading(false);
      }
    },
    [reducers]
  );

  return {
    role,
    setRole,
    addChampId,
    setAddChampId,
    addChampRole,
    setAddChampRole,
    addEventId,
    setAddEventId,
    addEventRole,
    setAddEventRole,
    loading,
    scopeError,
    infoModalOpen,
    setInfoModalOpen,
    availableChampionships,
    availableEvents,
    handleSaveRole,
    handleAddChampionship,
    handleAddEvent,
    handleRemoveChampionship,
    handleRemoveEvent,
    handleUpdateChampionshipRole,
    handleUpdateEventRole,
  };
}
