'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useMemo } from 'react';

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
import { supabase } from './supabase';

// ----------------------------------------------------------------------------
// Filas crudas tal como las regresa Supabase (snake_case). Se mapean abajo a
// los tipos camelCase que ya usan las pantallas (@/types), para no tener que
// tocar cada página que consume useStore().
// ----------------------------------------------------------------------------

interface DbProfile {
  id: string;
  gym_id: string | null;
  role: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
}

interface DbGym {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: 'MXN' | 'USD';
  member_prefix: string;
  logo_url: string | null;
  primary_color: string | null;
  active: boolean;
  subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
  created_at: string;
}

interface DbMembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  duration: number;
  duration_unit: 'days' | 'weeks' | 'months' | 'years';
  tolerance_days: number;
  description: string | null;
  active: boolean;
  created_at: string;
}

interface DbMember {
  id: string;
  gym_id: string;
  profile_id: string | null;
  member_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  photo_url: string | null;
  membership_plan_id: string | null;
  status: Member['status'];
  start_date: string | null;
  expiration_date: string | null;
  last_payment_date: string | null;
  blocked_at: string | null;
  blocked_by: string | null;
  block_reason: string | null;
  temporary_access_until: string | null;
  temporary_access_by: string | null;
  temporary_access_reason: string | null;
  mobile_app_status: Member['mobileAppStatus'];
  activation_code: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

interface DbPayment {
  id: string;
  gym_id: string;
  member_id: string;
  membership_plan_id: string | null;
  amount: number;
  method: Payment['method'];
  status: Payment['status'];
  payment_date: string;
  period_start: string;
  period_end: string;
  reference: string | null;
  notes: string | null;
  registered_by: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  correction_of: string | null;
  created_at: string;
}

interface DbAccessLog {
  id: string;
  gym_id: string;
  member_id: string | null;
  result: AccessLog['result'];
  reader: string;
  raw_qr_code: string | null;
  scanned_at: string;
}

interface DbInventoryItem {
  id: string;
  gym_id: string;
  area: InventoryItem['area'];
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  sku: string | null;
  quantity: number;
  min_stock: number | null;
  unit_measure: string | null;
  location: string | null;
  status: InventoryItem['status'];
  purchase_date: string | null;
  purchase_price: number | null;
  repair_price: number | null;
  sale_price: number | null;
  supplier: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  notes: string | null;
  created_at: string;
}

interface DbTrainerClient {
  id: string;
  trainer_id: string;
  client_id: string;
  assigned_at: string;
}

interface DbRoutine {
  id: string;
  trainer_id: string | null;
  client_id: string | null;
  title: string;
  goal: string | null;
  created_at: string;
}

interface DbRoutineExercise {
  id: string;
  routine_id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  order_index: number;
  notes: string | null;
}

function randomCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ----------------------------------------------------------------------------

interface AppStore {
  gym: Gym | null;
  members: Member[];
  payments: Payment[];
  accessLogs: AccessLog[];
  memberships: Membership[];
  staff: Staff[];
  // El inventario todavía no tiene tabla propia en Supabase — vive como
  // estado local sembrado de apps/web/data/inventory.ts. Conectarlo a un
  // backend real (tabla inventory_items + RLS) queda como pendiente.
  inventory: InventoryItem[];
  trainers: Trainer[];
  trainerAssignments: TrainerAssignment[];
  // Solo las rutinas genéricas (sin cliente asignado) se gestionan desde el
  // dashboard. Las personalizadas por cliente siguen siendo trabajo del
  // entrenador, desde la app móvil.
  genericRoutines: Routine[];
  isLoading: boolean;
  addMember: (input: Partial<Member>) => Promise<Member>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  addPayment: (input: Partial<Payment>) => Promise<Payment>;
  cancelPayment: (id: string, _cancelledByLabel: string, reason: string) => Promise<void>;
  addAccessLog: (log: Partial<AccessLog>) => Promise<void>;
  updateMembership: (id: string, updates: Partial<Membership>) => Promise<void>;
  addMembership: (input: Partial<Membership>) => Promise<Membership>;
  // No se tipa con Staff['role'] porque también se usa para crear
  // entrenadores (rol 'trainer'), que no forman parte del tipo Staff.
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

function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(' ');
  return { firstName: firstName ?? '', lastName: rest.join(' ') };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const gymId = user?.gymId ?? null;
  const enabled = !!user;

  const gymQuery = useQuery({
    queryKey: ['gym', gymId],
    enabled: enabled && !!gymId,
    queryFn: async (): Promise<DbGym | null> => {
      const { data, error } = await supabase.from('gyms').select('*').eq('id', gymId as string).single();
      if (error) throw error;
      return data;
    },
  });

  const profilesQuery = useQuery({
    queryKey: ['staff-profiles', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbProfile[]> => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const membersQuery = useQuery({
    queryKey: ['members', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbMember[]> => {
      const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ['membership-plans', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbMembershipPlan[]> => {
      const { data, error } = await supabase.from('membership_plans').select('*').order('price');
      if (error) throw error;
      return data ?? [];
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbPayment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const accessLogsQuery = useQuery({
    queryKey: ['access-logs', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbAccessLog[]> => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory-items', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbInventoryItem[]> => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const trainerClientsQuery = useQuery({
    queryKey: ['trainer-clients', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbTrainerClient[]> => {
      const { data, error } = await supabase.from('trainer_clients').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const genericRoutinesQuery = useQuery({
    queryKey: ['generic-routines', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbRoutine[]> => {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .is('client_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const genericRoutineIds = (genericRoutinesQuery.data ?? []).map((r) => r.id).join(',');

  const genericRoutineExercisesQuery = useQuery({
    queryKey: ['generic-routine-exercises', genericRoutineIds],
    enabled: enabled && !!genericRoutineIds,
    queryFn: async (): Promise<DbRoutineExercise[]> => {
      const ids = genericRoutineIds.split(',').filter(Boolean);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from('routine_exercises')
        .select('*')
        .in('routine_id', ids)
        .order('order_index');
      if (error) throw error;
      return data ?? [];
    },
  });

  const profilesById = useMemo(() => {
    const map = new Map<string, DbProfile>();
    for (const p of profilesQuery.data ?? []) map.set(p.id, p);
    return map;
  }, [profilesQuery.data]);

  const plansById = useMemo(() => {
    const map = new Map<string, DbMembershipPlan>();
    for (const p of plansQuery.data ?? []) map.set(p.id, p);
    return map;
  }, [plansQuery.data]);

  const membersById = useMemo(() => {
    const map = new Map<string, DbMember>();
    for (const m of membersQuery.data ?? []) map.set(m.id, m);
    return map;
  }, [membersQuery.data]);

  const nameOf = (id: string | null) => (id ? profilesById.get(id)?.full_name ?? id : undefined);

  const gym: Gym | null = useMemo(() => {
    const g = gymQuery.data;
    if (!g) return null;
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      address: g.address ?? '',
      phone: g.phone ?? '',
      email: g.email ?? '',
      timezone: g.timezone,
      currency: g.currency,
      memberPrefix: g.member_prefix,
      logoUrl: g.logo_url ?? undefined,
      primaryColor: g.primary_color ?? '#2563eb',
      active: g.active,
      subscriptionStatus: g.subscription_status,
      memberCount: membersQuery.data?.length ?? 0,
      createdAt: g.created_at,
    };
  }, [gymQuery.data, membersQuery.data]);

  const memberships: Membership[] = useMemo(
    () =>
      (plansQuery.data ?? []).map((p) => ({
        id: p.id,
        gymId: p.gym_id,
        name: p.name,
        price: p.price,
        duration: p.duration,
        durationUnit: p.duration_unit,
        toleranceDays: p.tolerance_days,
        description: p.description ?? undefined,
        active: p.active,
        memberCount: (membersQuery.data ?? []).filter((m) => m.membership_plan_id === p.id).length,
        createdAt: p.created_at,
      })),
    [plansQuery.data, membersQuery.data]
  );

  const members: Member[] = useMemo(
    () =>
      (membersQuery.data ?? []).map((m) => ({
        id: m.id,
        gymId: m.gym_id,
        memberNumber: m.member_number,
        firstName: m.first_name,
        lastName: m.last_name,
        phone: m.phone,
        email: m.email ?? undefined,
        birthDate: m.birth_date ?? undefined,
        photoUrl: m.photo_url ?? undefined,
        membershipId: m.membership_plan_id ?? '',
        status: m.status,
        startDate: m.start_date ?? '',
        expirationDate: m.expiration_date ?? '',
        lastPaymentDate: m.last_payment_date ?? undefined,
        lastAccessDate: undefined,
        blockedAt: m.blocked_at ?? undefined,
        blockedBy: nameOf(m.blocked_by),
        blockReason: m.block_reason ?? undefined,
        temporaryAccessUntil: m.temporary_access_until ?? undefined,
        temporaryAccessBy: nameOf(m.temporary_access_by),
        temporaryAccessReason: m.temporary_access_reason ?? undefined,
        mobileAppStatus: m.mobile_app_status,
        activationCode: m.activation_code ?? undefined,
        emergencyContact: m.emergency_contact ?? undefined,
        emergencyPhone: m.emergency_phone ?? undefined,
        notes: m.notes ?? undefined,
        createdAt: m.created_at,
        createdBy: nameOf(m.created_by) ?? '',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [membersQuery.data, profilesQuery.data]
  );

  const payments: Payment[] = useMemo(
    () =>
      (paymentsQuery.data ?? []).map((p) => {
        const member = membersById.get(p.member_id);
        const plan = p.membership_plan_id ? plansById.get(p.membership_plan_id) : undefined;
        return {
          id: p.id,
          gymId: p.gym_id,
          memberId: p.member_id,
          memberNumber: member?.member_number ?? '',
          memberName: member ? `${member.first_name} ${member.last_name}` : '',
          membershipId: p.membership_plan_id ?? '',
          membershipName: plan?.name ?? '',
          amount: Number(p.amount),
          method: p.method,
          status: p.status,
          paymentDate: p.payment_date,
          periodStart: p.period_start,
          periodEnd: p.period_end,
          reference: p.reference ?? undefined,
          notes: p.notes ?? undefined,
          registeredBy: nameOf(p.registered_by) ?? '',
          cancelledBy: nameOf(p.cancelled_by),
          cancelReason: p.cancel_reason ?? undefined,
          cancelledAt: p.cancelled_at ?? undefined,
          correctionOf: p.correction_of ?? undefined,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paymentsQuery.data, membersById, plansById, profilesQuery.data]
  );

  const accessLogs: AccessLog[] = useMemo(
    () =>
      (accessLogsQuery.data ?? []).map((a) => {
        const member = a.member_id ? membersById.get(a.member_id) : undefined;
        const plan = member?.membership_plan_id ? plansById.get(member.membership_plan_id) : undefined;
        const days = member?.expiration_date
          ? Math.round((new Date(member.expiration_date).getTime() - Date.now()) / 86400000)
          : undefined;
        return {
          id: a.id,
          gymId: a.gym_id,
          memberId: a.member_id ?? undefined,
          memberNumber: member?.member_number,
          memberName: member ? `${member.first_name} ${member.last_name}` : undefined,
          membershipName: plan?.name,
          result: a.result,
          timestamp: a.scanned_at,
          reader: a.reader,
          membershipExpirationDate: member?.expiration_date ?? undefined,
          daysUntilExpiration: days != null && days >= 0 ? days : undefined,
          daysSinceExpiration: days != null && days < 0 ? Math.abs(days) : undefined,
          lastPaymentDate: member?.last_payment_date ?? undefined,
          blockReason: member?.block_reason ?? undefined,
          rawQrCode: a.raw_qr_code ?? undefined,
        };
      }),
    [accessLogsQuery.data, membersById, plansById]
  );

  const inventory: InventoryItem[] = useMemo(
    () =>
      (inventoryQuery.data ?? []).map((i) => ({
        id: i.id,
        gymId: i.gym_id,
        area: i.area,
        name: i.name,
        brand: i.brand ?? undefined,
        model: i.model ?? undefined,
        serialNumber: i.serial_number ?? undefined,
        sku: i.sku ?? undefined,
        quantity: i.quantity,
        minStock: i.min_stock ?? undefined,
        unitMeasure: i.unit_measure ?? undefined,
        location: i.location ?? undefined,
        status: i.status,
        purchaseDate: i.purchase_date ?? undefined,
        purchasePrice: i.purchase_price ?? undefined,
        repairPrice: i.repair_price ?? undefined,
        salePrice: i.sale_price ?? undefined,
        supplier: i.supplier ?? undefined,
        lastMaintenance: i.last_maintenance ?? undefined,
        nextMaintenance: i.next_maintenance ?? undefined,
        notes: i.notes ?? undefined,
      })),
    [inventoryQuery.data]
  );

  const trainers: Trainer[] = useMemo(
    () =>
      (profilesQuery.data ?? [])
        .filter((p) => p.role === 'trainer')
        .map((p) => {
          const { firstName, lastName } = splitName(p.full_name);
          return {
            id: p.id,
            gymId: p.gym_id,
            firstName,
            lastName,
            email: p.email ?? '',
            phone: p.phone ?? undefined,
          };
        }),
    [profilesQuery.data]
  );

  const trainerAssignments: TrainerAssignment[] = useMemo(
    () =>
      (trainerClientsQuery.data ?? []).map((tc) => ({
        id: tc.id,
        trainerId: tc.trainer_id,
        clientId: tc.client_id,
        assignedAt: tc.assigned_at,
      })),
    [trainerClientsQuery.data]
  );

  const genericRoutines: Routine[] = useMemo(
    () =>
      (genericRoutinesQuery.data ?? []).map((r) => ({
        id: r.id,
        trainerId: r.trainer_id ?? undefined,
        clientId: r.client_id ?? undefined,
        title: r.title,
        goal: r.goal ?? undefined,
        createdAt: r.created_at,
        exercises: (genericRoutineExercisesQuery.data ?? [])
          .filter((e) => e.routine_id === r.id)
          .sort((a, b) => a.order_index - b.order_index)
          .map((e) => ({
            id: e.id,
            routineId: e.routine_id,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.rest_seconds ?? undefined,
            orderIndex: e.order_index,
            notes: e.notes ?? undefined,
          })),
      })),
    [genericRoutinesQuery.data, genericRoutineExercisesQuery.data]
  );

  const STAFF_ROLES = ['admin', 'receptionist', 'platform_admin'];
  const staff: Staff[] = useMemo(
    () =>
      (profilesQuery.data ?? [])
        .filter((p) => STAFF_ROLES.includes(p.role))
        .map((p) => {
          const { firstName, lastName } = splitName(p.full_name);
          return {
            id: p.id,
            gymId: p.gym_id ?? undefined,
            firstName,
            lastName,
            email: p.email ?? '',
            role: p.role as Staff['role'],
            active: p.active,
            lastLogin: undefined,
            paymentsRegistered: (paymentsQuery.data ?? []).filter((pay) => pay.registered_by === p.id).length,
            actionsCount: 0,
            createdAt: p.created_at,
          };
        }),
    [profilesQuery.data, paymentsQuery.data]
  );

  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

  const addMember: AppStore['addMember'] = async (input) => {
    if (!user || !gymId) throw new Error('No hay sesión activa');

    const existingNumbers = (membersQuery.data ?? [])
      .map((m) => parseInt(m.member_number.split('-').pop() ?? '0', 10))
      .filter((n) => !isNaN(n));
    const prefix = gymQuery.data?.member_prefix ?? 'AF';
    const nextNumber = `${prefix}-${String(Math.max(0, ...existingNumbers) + 1).padStart(5, '0')}`;

    const { data, error } = await supabase
      .from('members')
      .insert({
        gym_id: gymId,
        member_number: nextNumber,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        email: input.email || null,
        birth_date: input.birthDate || null,
        membership_plan_id: input.membershipId || null,
        status: input.status ?? 'pending_activation',
        start_date: input.startDate || null,
        expiration_date: input.expirationDate || null,
        emergency_contact: input.emergencyContact || null,
        emergency_phone: input.emergencyPhone || null,
        notes: input.notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    await invalidate('members');

    return {
      id: data.id,
      gymId: data.gym_id,
      memberNumber: data.member_number,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      email: data.email ?? undefined,
      membershipId: data.membership_plan_id ?? '',
      status: data.status,
      startDate: data.start_date ?? '',
      expirationDate: data.expiration_date ?? '',
      mobileAppStatus: data.mobile_app_status,
      createdAt: data.created_at,
      createdBy: user.id,
    };
  };

  const updateMember: AppStore['updateMember'] = async (id, updates) => {
    if (!user) throw new Error('No hay sesión activa');

    const payload: Record<string, unknown> = {};
    if ('status' in updates) payload.status = updates.status;
    if ('membershipId' in updates) payload.membership_plan_id = updates.membershipId;
    if ('expirationDate' in updates) payload.expiration_date = updates.expirationDate ?? null;
    if ('lastPaymentDate' in updates) payload.last_payment_date = updates.lastPaymentDate ?? null;
    if ('blockedAt' in updates) payload.blocked_at = updates.blockedAt ?? null;
    if ('blockedBy' in updates) payload.blocked_by = updates.blockedBy ? user.id : null;
    if ('blockReason' in updates) payload.block_reason = updates.blockReason ?? null;
    if ('temporaryAccessUntil' in updates) payload.temporary_access_until = updates.temporaryAccessUntil ?? null;
    if ('temporaryAccessBy' in updates) payload.temporary_access_by = updates.temporaryAccessBy ? user.id : null;
    if ('temporaryAccessReason' in updates) payload.temporary_access_reason = updates.temporaryAccessReason ?? null;
    if ('mobileAppStatus' in updates) payload.mobile_app_status = updates.mobileAppStatus;
    if ('activationCode' in updates) payload.activation_code = updates.activationCode ? randomCode() : null;
    if ('notes' in updates) payload.notes = updates.notes ?? null;

    const { error } = await supabase.from('members').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('members');
  };

  const addPayment: AppStore['addPayment'] = async (input) => {
    if (!user) throw new Error('No hay sesión activa');

    const { data, error } = await supabase
      .from('payments')
      .insert({
        gym_id: gymId,
        member_id: input.memberId,
        membership_plan_id: input.membershipId || null,
        amount: input.amount,
        method: input.method,
        status: 'confirmed',
        payment_date: input.paymentDate,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        reference: input.reference || null,
        notes: input.notes || null,
        registered_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    await Promise.all([invalidate('payments'), invalidate('members')]);

    return {
      id: data.id,
      gymId: data.gym_id,
      memberId: data.member_id,
      memberNumber: input.memberNumber ?? '',
      memberName: input.memberName ?? '',
      membershipId: data.membership_plan_id ?? '',
      membershipName: input.membershipName ?? '',
      amount: Number(data.amount),
      method: data.method,
      status: data.status,
      paymentDate: data.payment_date,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      registeredBy: user.id,
    };
  };

  const cancelPayment: AppStore['cancelPayment'] = async (id, _label, reason) => {
    if (!user) throw new Error('No hay sesión activa');
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        cancelled_by: user.id,
        cancel_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    await invalidate('payments');
  };

  const addAccessLog: AppStore['addAccessLog'] = async () => {
    // El Monitor de Acceso ya no fabrica logs localmente: usa la RPC
    // validate_access (ver access-monitor/page.tsx), que inserta el log real
    // del lado del servidor. Este método se deja como no-op por compatibilidad.
    await invalidate('access-logs');
  };

  const addMembership: AppStore['addMembership'] = async (input) => {
    if (!gymId) throw new Error('No hay sesión activa');
    const { data, error } = await supabase
      .from('membership_plans')
      .insert({
        gym_id: gymId,
        name: input.name,
        price: input.price,
        duration: input.duration,
        duration_unit: input.durationUnit,
        tolerance_days: input.toleranceDays ?? 0,
        description: input.description || null,
        active: true,
      })
      .select()
      .single();
    if (error) throw error;
    await invalidate('membership-plans');
    return {
      id: data.id,
      gymId: data.gym_id,
      name: data.name,
      price: data.price,
      duration: data.duration,
      durationUnit: data.duration_unit,
      toleranceDays: data.tolerance_days,
      description: data.description ?? undefined,
      active: data.active,
      memberCount: 0,
      createdAt: data.created_at,
    };
  };

  const updateMembership: AppStore['updateMembership'] = async (id, updates) => {
    const payload: Record<string, unknown> = {};
    if ('name' in updates) payload.name = updates.name;
    if ('price' in updates) payload.price = updates.price;
    if ('duration' in updates) payload.duration = updates.duration;
    if ('durationUnit' in updates) payload.duration_unit = updates.durationUnit;
    if ('toleranceDays' in updates) payload.tolerance_days = updates.toleranceDays;
    if ('description' in updates) payload.description = updates.description ?? null;
    if ('active' in updates) payload.active = updates.active;

    const { error } = await supabase.from('membership_plans').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('membership-plans');
  };

  const addStaff: AppStore['addStaff'] = async (input) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch('/api/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        role: input.role,
      }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? 'No se pudo crear el empleado');
    await invalidate('staff-profiles');
    return { tempPassword: json.tempPassword };
  };

  const updateStaff: AppStore['updateStaff'] = async (id, updates) => {
    const payload: Record<string, unknown> = {};
    if (updates.firstName || updates.lastName) {
      const current = profilesById.get(id);
      const firstName = updates.firstName ?? splitName(current?.full_name ?? '').firstName;
      const lastName = updates.lastName ?? splitName(current?.full_name ?? '').lastName;
      payload.full_name = `${firstName} ${lastName}`.trim();
    }
    if ('role' in updates) payload.role = updates.role;
    if ('active' in updates) payload.active = updates.active;

    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('staff-profiles');
  };

  const addInventoryItem: AppStore['addInventoryItem'] = (item) => {
    if (!gymId) return;
    supabase
      .from('inventory_items')
      .insert({
        gym_id: gymId,
        area: item.area,
        name: item.name,
        brand: item.brand || null,
        model: item.model || null,
        serial_number: item.serialNumber || null,
        sku: item.sku || null,
        quantity: item.quantity,
        min_stock: item.minStock ?? null,
        unit_measure: item.unitMeasure || null,
        location: item.location || null,
        status: item.status,
        purchase_date: item.purchaseDate || null,
        purchase_price: item.purchasePrice ?? null,
        repair_price: item.repairPrice ?? null,
        sale_price: item.salePrice ?? null,
        supplier: item.supplier || null,
        last_maintenance: item.lastMaintenance || null,
        next_maintenance: item.nextMaintenance || null,
        notes: item.notes || null,
        created_by: user?.id ?? null,
      })
      .then(({ error }) => {
        if (error) throw error;
        invalidate('inventory-items');
      });
  };

  const updateInventoryItem: AppStore['updateInventoryItem'] = (id, updates) => {
    const payload: Record<string, unknown> = {};
    if ('area' in updates) payload.area = updates.area;
    if ('name' in updates) payload.name = updates.name;
    if ('brand' in updates) payload.brand = updates.brand || null;
    if ('model' in updates) payload.model = updates.model || null;
    if ('serialNumber' in updates) payload.serial_number = updates.serialNumber || null;
    if ('sku' in updates) payload.sku = updates.sku || null;
    if ('quantity' in updates) payload.quantity = updates.quantity;
    if ('minStock' in updates) payload.min_stock = updates.minStock ?? null;
    if ('unitMeasure' in updates) payload.unit_measure = updates.unitMeasure || null;
    if ('location' in updates) payload.location = updates.location || null;
    if ('status' in updates) payload.status = updates.status;
    if ('purchaseDate' in updates) payload.purchase_date = updates.purchaseDate || null;
    if ('purchasePrice' in updates) payload.purchase_price = updates.purchasePrice ?? null;
    if ('repairPrice' in updates) payload.repair_price = updates.repairPrice ?? null;
    if ('salePrice' in updates) payload.sale_price = updates.salePrice ?? null;
    if ('supplier' in updates) payload.supplier = updates.supplier || null;
    if ('lastMaintenance' in updates) payload.last_maintenance = updates.lastMaintenance || null;
    if ('nextMaintenance' in updates) payload.next_maintenance = updates.nextMaintenance || null;
    if ('notes' in updates) payload.notes = updates.notes || null;

    supabase
      .from('inventory_items')
      .update(payload)
      .eq('id', id)
      .then(({ error }) => {
        if (error) throw error;
        invalidate('inventory-items');
      });
  };

  const deleteInventoryItem: AppStore['deleteInventoryItem'] = (id) => {
    supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) throw error;
        invalidate('inventory-items');
      });
  };

  const assignTrainer: AppStore['assignTrainer'] = async (clientId, trainerId) => {
    const { error } = await supabase
      .from('trainer_clients')
      .upsert({ client_id: clientId, trainer_id: trainerId }, { onConflict: 'client_id' });
    if (error) throw error;
    await invalidate('trainer-clients');
  };

  const unassignTrainer: AppStore['unassignTrainer'] = async (clientId) => {
    const { error } = await supabase.from('trainer_clients').delete().eq('client_id', clientId);
    if (error) throw error;
    await invalidate('trainer-clients');
  };

  const addGenericRoutine: AppStore['addGenericRoutine'] = async (input) => {
    const { data, error } = await supabase
      .from('routines')
      .insert({ client_id: null, trainer_id: null, title: input.title, goal: input.goal || null })
      .select()
      .single();
    if (error) throw error;
    await invalidate('generic-routines');
    return {
      id: data.id,
      title: data.title,
      goal: data.goal ?? undefined,
      createdAt: data.created_at,
      exercises: [],
    };
  };

  const updateGenericRoutine: AppStore['updateGenericRoutine'] = async (id, updates) => {
    const payload: Record<string, unknown> = {};
    if ('title' in updates) payload.title = updates.title;
    if ('goal' in updates) payload.goal = updates.goal || null;
    const { error } = await supabase.from('routines').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('generic-routines');
  };

  const deleteGenericRoutine: AppStore['deleteGenericRoutine'] = async (id) => {
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) throw error;
    await Promise.all([invalidate('generic-routines'), invalidate('generic-routine-exercises')]);
  };

  const replaceRoutineExercises: AppStore['replaceRoutineExercises'] = async (routineId, exercises) => {
    const { error: deleteError } = await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
    if (deleteError) throw deleteError;

    if (exercises.length) {
      const { error: insertError } = await supabase.from('routine_exercises').insert(
        exercises.map((e, index) => ({
          routine_id: routineId,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          rest_seconds: e.restSeconds ?? null,
          order_index: index,
          notes: e.notes || null,
        }))
      );
      if (insertError) throw insertError;
    }

    await invalidate('generic-routine-exercises');
  };

  const isLoading =
    profilesQuery.isLoading || membersQuery.isLoading || plansQuery.isLoading || paymentsQuery.isLoading;

  return (
    <StoreContext.Provider
      value={{
        gym,
        members,
        payments,
        accessLogs,
        memberships,
        staff,
        inventory,
        trainers,
        trainerAssignments,
        genericRoutines,
        isLoading,
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
