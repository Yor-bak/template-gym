'use client';
import React, { createContext, useContext, useMemo, useState } from 'react';

import {
  accessLogs as accessLogsSeed,
  currentGym,
  genericRoutines as genericRoutinesSeed,
  inventory as inventorySeed,
  members as membersSeed,
  memberships as membershipsSeed,
  payments as paymentsSeed,
  staff as staffSeed,
  trainerAssignments as trainerAssignmentsSeed,
  trainers as trainersSeed,
} from '@/data';
import type {
  AccessLog,
  Gym,
  InventoryItem,
  Member,
  Membership,
  Payment,
  Routine,
  RoutineExercise,
  Staff,
  Trainer,
  TrainerAssignment,
} from '@/types';
import { useAuth } from './auth';

// ----------------------------------------------------------------------------
// Store en memoria (modo mock). Sustituye temporalmente al backend real
// mientras se construye el nuevo backend en Python/FastAPI + SQLAlchemy +
// PostgreSQL. Mantiene exactamente la misma interfaz pública (AppStore) que
// tenían las páginas cuando hablaban con Supabase, para no tocar ninguna
// pantalla — solo cambia de dónde sale/adónde va el dato.
// ----------------------------------------------------------------------------

function randomCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

interface AppStore {
  gym: Gym | null;
  members: Member[];
  payments: Payment[];
  accessLogs: AccessLog[];
  memberships: Membership[];
  staff: Staff[];
  inventory: InventoryItem[];
  trainers: Trainer[];
  trainerAssignments: TrainerAssignment[];
  genericRoutines: Routine[];
  isLoading: boolean;
  updateGym: (updates: Partial<Gym>) => Promise<void>;
  addMember: (input: Partial<Member>) => Promise<Member>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  addPayment: (input: Partial<Payment>) => Promise<Payment>;
  cancelPayment: (id: string, cancelledByLabel: string, reason: string) => Promise<void>;
  addAccessLog: (log: Partial<AccessLog>) => Promise<void>;
  updateMembership: (id: string, updates: Partial<Membership>) => Promise<void>;
  addMembership: (input: Partial<Membership>) => Promise<Membership>;
  addStaff: (input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role: Staff['role'] | 'trainer';
  }) => Promise<{ tempPassword: string }>;
  updateStaff: (id: string, updates: Partial<Staff>) => Promise<void>;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  assignTrainer: (clientId: string, trainerId: string) => Promise<void>;
  unassignTrainer: (clientId: string) => Promise<void>;
  addGenericRoutine: (input: { title: string; goal?: string }) => Promise<Routine>;
  updateGenericRoutine: (id: string, updates: { title?: string; goal?: string }) => Promise<void>;
  deleteGenericRoutine: (id: string) => Promise<void>;
  replaceRoutineExercises: (routineId: string, exercises: Omit<RoutineExercise, 'id' | 'routineId'>[]) => Promise<void>;
}

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [gym, setGym] = useState<Gym>(currentGym);
  const [members, setMembers] = useState<Member[]>(membersSeed);
  const [payments, setPayments] = useState<Payment[]>(paymentsSeed);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(accessLogsSeed);
  const [membershipPlans, setMembershipPlans] = useState<Membership[]>(membershipsSeed);
  const [staff, setStaff] = useState<Staff[]>(staffSeed);
  const [inventory, setInventory] = useState<InventoryItem[]>(inventorySeed);
  const [trainers, setTrainers] = useState<Trainer[]>(trainersSeed);
  const [trainerAssignments, setTrainerAssignments] = useState<TrainerAssignment[]>(trainerAssignmentsSeed);
  const [genericRoutines, setGenericRoutines] = useState<Routine[]>(genericRoutinesSeed);

  const memberships: Membership[] = useMemo(
    () =>
      membershipPlans.map((p) => ({
        ...p,
        memberCount: members.filter((m) => m.membershipId === p.id).length,
      })),
    [membershipPlans, members]
  );

  const gymWithCount: Gym = useMemo(() => ({ ...gym, memberCount: members.length }), [gym, members]);

  const updateGym: AppStore['updateGym'] = async (updates) => {
    setGym((prev) => ({ ...prev, ...updates }));
  };

  const addMember: AppStore['addMember'] = async (input) => {
    const existingNumbers = members
      .map((m) => parseInt(m.memberNumber.split('-').pop() ?? '0', 10))
      .filter((n) => !isNaN(n));
    const nextNumber = `${gym.memberPrefix}-${String(Math.max(0, ...existingNumbers) + 1).padStart(5, '0')}`;

    const member: Member = {
      id: randomId('mem'),
      gymId: gym.id,
      memberNumber: nextNumber,
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
      phone: input.phone ?? '',
      email: input.email,
      birthDate: input.birthDate,
      membershipId: input.membershipId ?? '',
      status: input.status ?? 'pending_activation',
      startDate: input.startDate ?? '',
      expirationDate: input.expirationDate ?? '',
      emergencyContact: input.emergencyContact,
      emergencyPhone: input.emergencyPhone,
      notes: input.notes,
      mobileAppStatus: 'not_activated',
      createdAt: new Date().toISOString(),
      createdBy: user ? `${user.firstName} ${user.lastName}` : '',
    };
    setMembers((prev) => [member, ...prev]);
    return member;
  };

  const updateMember: AppStore['updateMember'] = async (id, updates) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const next: Member = { ...m, ...updates };
        if ('activationCode' in updates) {
          next.activationCode = updates.activationCode ? randomCode() : undefined;
        }
        if ('blockedBy' in updates && updates.blockedBy) {
          next.blockedBy = user ? `${user.firstName} ${user.lastName}` : updates.blockedBy;
        }
        if ('temporaryAccessBy' in updates && updates.temporaryAccessBy) {
          next.temporaryAccessBy = user ? `${user.firstName} ${user.lastName}` : updates.temporaryAccessBy;
        }
        return next;
      })
    );
  };

  const addPayment: AppStore['addPayment'] = async (input) => {
    const payment: Payment = {
      id: randomId('pay'),
      gymId: gym.id,
      memberId: input.memberId ?? '',
      memberNumber: input.memberNumber ?? '',
      memberName: input.memberName ?? '',
      membershipId: input.membershipId ?? '',
      membershipName: input.membershipName ?? '',
      amount: input.amount ?? 0,
      method: input.method ?? 'cash',
      status: 'confirmed',
      paymentDate: input.paymentDate ?? new Date().toISOString().split('T')[0],
      periodStart: input.periodStart ?? '',
      periodEnd: input.periodEnd ?? '',
      reference: input.reference,
      notes: input.notes,
      registeredBy: user ? `${user.firstName} ${user.lastName}` : '',
    };
    setPayments((prev) => [payment, ...prev]);

    if (payment.memberId) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === payment.memberId
            ? { ...m, status: 'active', lastPaymentDate: payment.paymentDate, expirationDate: payment.periodEnd }
            : m
        )
      );
    }

    return payment;
  };

  const cancelPayment: AppStore['cancelPayment'] = async (id, _label, reason) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'cancelled',
              cancelledBy: user ? `${user.firstName} ${user.lastName}` : undefined,
              cancelReason: reason,
              cancelledAt: new Date().toISOString(),
            }
          : p
      )
    );
  };

  const addAccessLog: AppStore['addAccessLog'] = async (log) => {
    const entry: AccessLog = {
      id: randomId('acc'),
      gymId: gym.id,
      result: log.result ?? 'invalid_qr',
      timestamp: log.timestamp ?? new Date().toISOString(),
      reader: log.reader ?? 'Entrada principal',
      memberId: log.memberId,
      memberNumber: log.memberNumber,
      memberName: log.memberName,
      membershipName: log.membershipName,
      membershipExpirationDate: log.membershipExpirationDate,
      daysUntilExpiration: log.daysUntilExpiration,
      daysSinceExpiration: log.daysSinceExpiration,
      lastPaymentDate: log.lastPaymentDate,
      blockReason: log.blockReason,
      rawQrCode: log.rawQrCode,
    };
    setAccessLogs((prev) => [entry, ...prev]);
  };

  const addMembership: AppStore['addMembership'] = async (input) => {
    const plan: Membership = {
      id: randomId('ms'),
      gymId: gym.id,
      name: input.name ?? '',
      price: input.price ?? 0,
      duration: input.duration ?? 1,
      durationUnit: input.durationUnit ?? 'months',
      toleranceDays: input.toleranceDays ?? 0,
      description: input.description,
      active: true,
      memberCount: 0,
      createdAt: new Date().toISOString(),
    };
    setMembershipPlans((prev) => [plan, ...prev]);
    return plan;
  };

  const updateMembership: AppStore['updateMembership'] = async (id, updates) => {
    setMembershipPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const addStaff: AppStore['addStaff'] = async (input) => {
    const tempPassword = randomCode(10);
    if (input.role === 'trainer') {
      const trainer: Trainer = {
        id: randomId('trn'),
        gymId: gym.id,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        email: input.email ?? '',
      };
      setTrainers((prev) => [trainer, ...prev]);
    } else {
      const member: Staff = {
        id: randomId('staff'),
        gymId: gym.id,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        email: input.email ?? '',
        role: input.role,
        active: true,
        paymentsRegistered: 0,
        actionsCount: 0,
        createdAt: new Date().toISOString(),
        password: tempPassword,
      };
      setStaff((prev) => [member, ...prev]);
    }
    return { tempPassword };
  };

  const updateStaff: AppStore['updateStaff'] = async (id, updates) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const addInventoryItem: AppStore['addInventoryItem'] = (item) => {
    setInventory((prev) => [{ ...item, id: item.id || randomId('inv'), gymId: gym.id }, ...prev]);
  };

  const updateInventoryItem: AppStore['updateInventoryItem'] = (id, updates) => {
    setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const deleteInventoryItem: AppStore['deleteInventoryItem'] = (id) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
  };

  const assignTrainer: AppStore['assignTrainer'] = async (clientId, trainerId) => {
    setTrainerAssignments((prev) => [
      ...prev.filter((a) => a.clientId !== clientId),
      { id: randomId('ta'), trainerId, clientId, assignedAt: new Date().toISOString() },
    ]);
  };

  const unassignTrainer: AppStore['unassignTrainer'] = async (clientId) => {
    setTrainerAssignments((prev) => prev.filter((a) => a.clientId !== clientId));
  };

  const addGenericRoutine: AppStore['addGenericRoutine'] = async (input) => {
    const routine: Routine = {
      id: randomId('rt'),
      title: input.title,
      goal: input.goal,
      createdAt: new Date().toISOString(),
      exercises: [],
    };
    setGenericRoutines((prev) => [routine, ...prev]);
    return routine;
  };

  const updateGenericRoutine: AppStore['updateGenericRoutine'] = async (id, updates) => {
    setGenericRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteGenericRoutine: AppStore['deleteGenericRoutine'] = async (id) => {
    setGenericRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const replaceRoutineExercises: AppStore['replaceRoutineExercises'] = async (routineId, exercises) => {
    setGenericRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId
          ? {
              ...r,
              exercises: exercises.map((e, index) => ({
                ...e,
                id: randomId('rte'),
                routineId,
                orderIndex: index,
              })),
            }
          : r
      )
    );
  };

  return (
    <StoreContext.Provider
      value={{
        gym: gymWithCount,
        members,
        payments,
        accessLogs,
        memberships,
        staff,
        inventory,
        trainers,
        trainerAssignments,
        genericRoutines,
        isLoading: false,
        updateGym,
        addMember,
        updateMember,
        addPayment,
        cancelPayment,
        addAccessLog,
        updateMembership,
        addMembership,
        addStaff,
        updateStaff,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        assignTrainer,
        unassignTrainer,
        addGenericRoutine,
        updateGenericRoutine,
        deleteGenericRoutine,
        replaceRoutineExercises,
      }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
