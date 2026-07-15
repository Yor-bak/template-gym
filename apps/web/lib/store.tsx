'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type {
  AccessLog,
  Gym,
  InventoryItem,
  InventorySale,
  SaleItem,
  Member,
  Membership,
  Payment,
  PaymentMethod,
  Routine,
  RoutineExercise,
  Staff,
  Trainer,
  TrainerAssignment,
} from '@/types';
import { useAuth } from './auth';
import { isDemoMode } from './data/config';
import { buildSeedState, clearDemoState, loadDemoState, saveDemoState, type DemoState } from './data/mock/seed';
import { supabase } from './supabase';
import { daysUntil, getAccessResultFromMemberStatus, normalizePhone } from './utils';

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
  // Ingresos de tienda: tampoco existe todavía una tabla real para esto en
  // Supabase (no hay migración de "inventory_sales"/"income"), así que vive
  // como estado local del propio provider en ambos modos — documentado como
  // pendiente de backend. El descuento de stock sí usa updateInventoryItem,
  // que en modo Supabase sí persiste contra la tabla real inventory_items.
  inventorySales: InventorySale[];
  trainers: Trainer[];
  trainerAssignments: TrainerAssignment[];
  // Solo las rutinas genéricas (sin cliente asignado) se gestionan desde el
  // dashboard. Las personalizadas por cliente siguen siendo trabajo del
  // entrenador, desde la app móvil.
  genericRoutines: Routine[];
  isLoading: boolean;
  updateGym: (updates: Partial<Gym>) => Promise<void>;
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
    // Los entrenadores ya no capturan correo — se usa para crearles cuenta
    // real (Supabase Auth exige un email), no se muestra en ningún lado.
    phone?: string;
    role: Staff['role'] | 'trainer';
  }) => Promise<{ tempPassword: string }>;
  updateStaff: (id: string, updates: Partial<Staff>) => Promise<void>;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  /**
   * Completa una venta de tienda con una o más líneas: valida existencias de
   * TODAS las líneas, descuenta stock, crea una única InventorySale y la
   * registra — operación tratada como una sola transacción lógica (si algo
   * falla, no se descuenta stock parcialmente ni queda un carrito a medias).
   */
  completeInventorySale: (input: {
    items: { itemId: string; quantity: number }[];
    method: PaymentMethod;
    memberId?: string;
    notes?: string;
  }) => Promise<InventorySale>;
  cancelInventorySale: (id: string, cancelledByLabel: string, reason: string) => Promise<void>;
  assignTrainer: (clientId: string, trainerId: string) => Promise<void>;
  unassignTrainer: (clientId: string) => Promise<void>;
  addGenericRoutine: (input: { title: string; goal?: string }) => Promise<Routine>;
  updateGenericRoutine: (id: string, updates: { title?: string; goal?: string }) => Promise<void>;
  deleteGenericRoutine: (id: string) => Promise<void>;
  replaceRoutineExercises: (routineId: string, exercises: Omit<RoutineExercise, 'id' | 'routineId'>[]) => Promise<void>;
  /** Simula un escaneo QR en el Monitor de Acceso y devuelve el log generado. */
  simulateAccess: (memberId: string | null, source?: AccessLog['source']) => Promise<AccessLog>;
  /** Valida un código crudo leído por la cámara/lector/entrada manual del escáner global. */
  validateAccessCode: (code: string, source?: AccessLog['source']) => Promise<AccessLog>;
  /** Sólo tiene efecto en modo demo: borra localStorage y vuelve al seed original. */
  resetDemoData: () => void;
}

const StoreContext = createContext<AppStore | null>(null);

function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(' ');
  return { firstName: firstName ?? '', lastName: rest.join(' ') };
}

// ----------------------------------------------------------------------------
// Modo Supabase: lógica original, sin cambios de comportamiento (salvo mover
// aquí la simulación de escaneo QR que antes vivía en access-monitor/page.tsx).
// ----------------------------------------------------------------------------
function SupabaseStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const gymId = user?.gymId ?? null;
  const enabled = !!user;

  const gymQuery = useQuery({
    queryKey: ['gym', gymId],
    enabled: enabled && !!gymId,
    queryFn: async (): Promise<DbGym | null> => {
      const { data, error } = await supabase!.from('gyms').select('*').eq('id', gymId as string).single();
      if (error) throw error;
      return data;
    },
  });

  const profilesQuery = useQuery({
    queryKey: ['staff-profiles', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbProfile[]> => {
      const { data, error } = await supabase!.from('profiles').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const membersQuery = useQuery({
    queryKey: ['members', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbMember[]> => {
      const { data, error } = await supabase!.from('members').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ['membership-plans', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbMembershipPlan[]> => {
      const { data, error } = await supabase!.from('membership_plans').select('*').order('price');
      if (error) throw error;
      return data ?? [];
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbPayment[]> => {
      const { data, error } = await supabase!
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
      const { data, error } = await supabase!
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
      const { data, error } = await supabase!
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
      const { data, error } = await supabase!.from('trainer_clients').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const genericRoutinesQuery = useQuery({
    queryKey: ['generic-routines', gymId, user?.role],
    enabled,
    queryFn: async (): Promise<DbRoutine[]> => {
      const { data, error } = await supabase!
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
      const { data, error } = await supabase!
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

  // No existe tabla real para ventas de tienda todavía — vive como estado
  // local del provider (se pierde al recargar). El stock que sí descuenta
  // (updateInventoryItem) es real y persiste en inventory_items.
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);

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
            phone: p.phone ?? '',
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

  // 'super_admin' (titular del contrato) es distinto de 'platform_admin'
  // (administrador global de J2EC) — ambos son roles de perfil, pero solo
  // super_admin pertenece conceptualmente al gimnasio como su dueño.
  const STAFF_ROLES = ['admin', 'receptionist', 'platform_admin', 'super_admin'];
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
            phone: p.phone ?? undefined,
            role: p.role as Staff['role'],
            active: p.active,
            isContractHolder: p.role === 'super_admin',
            lastLogin: undefined,
            paymentsRegistered: (paymentsQuery.data ?? []).filter((pay) => pay.registered_by === p.id).length,
            actionsCount: 0,
            createdAt: p.created_at,
          };
        }),
    [profilesQuery.data, paymentsQuery.data]
  );

  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

  const updateGym: AppStore['updateGym'] = async (updates) => {
    if (!gymId) throw new Error('No hay sesión activa');
    const payload: Record<string, unknown> = {};
    if ('name' in updates) payload.name = updates.name;
    if ('address' in updates) payload.address = updates.address || null;
    if ('phone' in updates) payload.phone = updates.phone || null;
    if ('email' in updates) payload.email = updates.email || null;
    if ('memberPrefix' in updates) payload.member_prefix = updates.memberPrefix;
    if ('currency' in updates) payload.currency = updates.currency;
    if ('timezone' in updates) payload.timezone = updates.timezone;
    if ('primaryColor' in updates) payload.primary_color = updates.primaryColor;

    const { error } = await supabase!.from('gyms').update(payload).eq('id', gymId);
    if (error) throw error;
    await invalidate('gym');
  };

  const addMember: AppStore['addMember'] = async (input) => {
    if (!user || !gymId) throw new Error('No hay sesión activa');

    const existingNumbers = (membersQuery.data ?? [])
      .map((m) => parseInt(m.member_number.split('-').pop() ?? '0', 10))
      .filter((n) => !isNaN(n));
    const prefix = gymQuery.data?.member_prefix ?? 'AF';
    const nextNumber = `${prefix}-${String(Math.max(0, ...existingNumbers) + 1).padStart(5, '0')}`;

    const { data, error } = await supabase!
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

    const { error } = await supabase!.from('members').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('members');
  };

  const addPayment: AppStore['addPayment'] = async (input) => {
    if (!user) throw new Error('No hay sesión activa');

    const { data, error } = await supabase!
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
    const { error } = await supabase!
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
    // El Monitor de Acceso ya no fabrica logs localmente: usa simulateAccess
    // (ver abajo), que inserta el log real del lado del servidor vía RPC. Este
    // método se deja como no-op por compatibilidad.
    await invalidate('access-logs');
  };

  const addMembership: AppStore['addMembership'] = async (input) => {
    if (!gymId) throw new Error('No hay sesión activa');
    const { data, error } = await supabase!
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

    const { error } = await supabase!.from('membership_plans').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('membership-plans');
  };

  const addStaff: AppStore['addStaff'] = async (input) => {
    // Validación de límites de Personal: no confiar solo en la interfaz. El
    // Super Admin nunca se crea por aquí, y solo puede existir una cuenta
    // activa por rol (admin/receptionist) por gimnasio. /api/staff repite
    // este chequeo del lado del servidor como defensa adicional.
    if (input.role === 'super_admin') {
      throw new Error('El Super Admin no se crea manualmente desde Personal.');
    }
    if (input.role === 'admin' || input.role === 'receptionist') {
      if (staff.some((s) => s.role === input.role && s.active)) {
        throw new Error(`Ya existe una cuenta activa con el rol ${input.role === 'admin' ? 'administrador' : 'recepcionista'} en este gimnasio.`);
      }
    }

    const {
      data: { session },
    } = await supabase!.auth.getSession();
    // Entrenadores ya no capturan correo en el formulario, pero Supabase Auth
    // exige uno para crear la cuenta — se sintetiza uno interno, invisible
    // para el usuario, a partir de su teléfono.
    const email =
      input.email ?? (input.role === 'trainer' ? `entrenador.${normalizePhone(input.phone ?? '')}.${Date.now()}@template-gym.local` : undefined);
    const response = await fetch('/api/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        phone: input.phone,
        role: input.role,
      }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? 'No se pudo crear el empleado');
    await invalidate('staff-profiles');
    return { tempPassword: json.tempPassword };
  };

  const updateStaff: AppStore['updateStaff'] = async (id, updates) => {
    const target = staff.find((s) => s.id === id);
    if (target?.isContractHolder && (updates.role !== undefined || updates.active !== undefined)) {
      throw new Error('El Super Admin no puede desactivarse ni cambiar de rol.');
    }

    const payload: Record<string, unknown> = {};
    if (updates.firstName || updates.lastName) {
      const current = profilesById.get(id);
      const firstName = updates.firstName ?? splitName(current?.full_name ?? '').firstName;
      const lastName = updates.lastName ?? splitName(current?.full_name ?? '').lastName;
      payload.full_name = `${firstName} ${lastName}`.trim();
    }
    if ('phone' in updates) payload.phone = updates.phone || null;
    if ('role' in updates) payload.role = updates.role;
    if ('active' in updates) payload.active = updates.active;

    const { error } = await supabase!.from('profiles').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('staff-profiles');
  };

  const addInventoryItem: AppStore['addInventoryItem'] = (item) => {
    if (!gymId) return;
    supabase!
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

    supabase!
      .from('inventory_items')
      .update(payload)
      .eq('id', id)
      .then(({ error }) => {
        if (error) throw error;
        invalidate('inventory-items');
      });
  };

  const deleteInventoryItem: AppStore['deleteInventoryItem'] = (id) => {
    supabase!
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) throw error;
        invalidate('inventory-items');
      });
  };

  const completeInventorySale: AppStore['completeInventorySale'] = async ({ items: lines, method, memberId, notes }) => {
    if (lines.length === 0) throw new Error('El carrito está vacío.');

    // 1) Validar TODAS las líneas antes de tocar cualquier stock — si una
    // falla, ninguna se aplica (nada de descuentos parciales).
    const resolved = lines.map(({ itemId, quantity }) => {
      const item = inventory.find((i) => i.id === itemId);
      if (!item) throw new Error('Uno de los productos del carrito ya no existe.');
      if (item.status !== 'operating') throw new Error(`${item.name} no está disponible para venta.`);
      if (quantity <= 0) throw new Error(`La cantidad de ${item.name} debe ser mayor a cero.`);
      if (item.quantity <= 0 || quantity > item.quantity) {
        throw new Error(`No hay existencias suficientes de ${item.name} para completar la venta.`);
      }
      // ALTA-10 (QA_AUDIT_REPORT_GYM.md): un salePrice negativo (fallo de
      // ALTA-09 en el origen) no debe poder venderse — generaría un total
      // negativo que se suma tal cual a los ingresos reportados.
      if (item.salePrice === undefined || item.salePrice <= 0) throw new Error(`${item.name} no tiene un precio de venta válido.`);
      return { item, quantity };
    });

    const member = memberId ? members.find((m) => m.id === memberId) : undefined;
    const saleItems: SaleItem[] = resolved.map(({ item, quantity }) => ({
      productId: item.id,
      productName: item.name,
      barcode: item.sku,
      quantity,
      unitPrice: item.salePrice!,
      subtotal: item.salePrice! * quantity,
    }));
    const total = saleItems.reduce((s, i) => s + i.subtotal, 0);

    const sale: InventorySale = {
      id: `isale_${Date.now()}`,
      gymId: gymId ?? resolved[0].item.gymId,
      items: saleItems,
      subtotal: total,
      total,
      method,
      status: 'confirmed',
      soldAt: new Date().toISOString(),
      registeredBy: user ? `${user.firstName} ${user.lastName}` : 'Recepción',
      memberId: member?.id,
      memberName: member ? `${member.firstName} ${member.lastName}` : undefined,
      notes,
    };

    // 2) Descontar stock — sí es real, pasa por updateInventoryItem (tabla inventory_items).
    // No existe todavía una función RPC/transacción de backend que agrupe
    // esto en una sola operación atómica de base de datos: en modo Supabase
    // esto es una serie de updates independientes (documentado como pendiente).
    resolved.forEach(({ item, quantity }) => updateInventoryItem(item.id, { quantity: item.quantity - quantity }));
    setInventorySales((prev) => [sale, ...prev]);
    return sale;
  };

  const cancelInventorySale: AppStore['cancelInventorySale'] = async (id, cancelledByLabel, reason) => {
    const sale = inventorySales.find((s) => s.id === id);
    if (!sale || sale.status === 'cancelled') return;
    sale.items.forEach((line) => {
      const item = inventory.find((i) => i.id === line.productId);
      if (item) updateInventoryItem(item.id, { quantity: item.quantity + line.quantity });
    });
    setInventorySales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'cancelled', cancelledBy: cancelledByLabel, cancelReason: reason, cancelledAt: new Date().toISOString() } : s))
    );
  };

  const assignTrainer: AppStore['assignTrainer'] = async (clientId, trainerId) => {
    const { error } = await supabase!
      .from('trainer_clients')
      .upsert({ client_id: clientId, trainer_id: trainerId }, { onConflict: 'client_id' });
    if (error) throw error;
    await invalidate('trainer-clients');
  };

  const unassignTrainer: AppStore['unassignTrainer'] = async (clientId) => {
    const { error } = await supabase!.from('trainer_clients').delete().eq('client_id', clientId);
    if (error) throw error;
    await invalidate('trainer-clients');
  };

  const addGenericRoutine: AppStore['addGenericRoutine'] = async (input) => {
    const { data, error } = await supabase!
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
    const { error } = await supabase!.from('routines').update(payload).eq('id', id);
    if (error) throw error;
    await invalidate('generic-routines');
  };

  const deleteGenericRoutine: AppStore['deleteGenericRoutine'] = async (id) => {
    const { error } = await supabase!.from('routines').delete().eq('id', id);
    if (error) throw error;
    await Promise.all([invalidate('generic-routines'), invalidate('generic-routine-exercises')]);
  };

  const replaceRoutineExercises: AppStore['replaceRoutineExercises'] = async (routineId, exercises) => {
    const { error: deleteError } = await supabase!.from('routine_exercises').delete().eq('routine_id', routineId);
    if (deleteError) throw deleteError;

    if (exercises.length) {
      const { error: insertError } = await supabase!.from('routine_exercises').insert(
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

  const simulateAccess: AppStore['simulateAccess'] = async (memberId, source) => {
    const member = memberId ? members.find((m) => m.id === memberId) : undefined;
    let code = `QR-SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    if (member) {
      const { data: accessCode } = await supabase!
        .from('client_access_codes')
        .select('code')
        .eq('member_id', member.id)
        .eq('active', true)
        .maybeSingle();
      if (accessCode) code = accessCode.code;
    }

    const { data: rpcResult, error } = await supabase!
      .rpc('validate_access', { p_code: code, p_reader: 'Entrada principal' })
      .single<DbAccessLog>();

    if (error || !rpcResult) throw error ?? new Error('No se pudo simular el escaneo');

    await Promise.all([invalidate('access-logs'), invalidate('members')]);

    const days = member?.expirationDate ? daysUntil(member.expirationDate) : undefined;
    const membership = member ? memberships.find((ms) => ms.id === member.membershipId) : undefined;

    return {
      id: rpcResult.id,
      gymId: rpcResult.gym_id,
      memberId: rpcResult.member_id ?? undefined,
      memberNumber: member?.memberNumber,
      memberName: member ? `${member.firstName} ${member.lastName}` : undefined,
      membershipName: membership?.name,
      result: rpcResult.result,
      timestamp: rpcResult.scanned_at,
      reader: rpcResult.reader,
      membershipExpirationDate: member?.expirationDate,
      daysUntilExpiration: days != null && days >= 0 ? days : undefined,
      daysSinceExpiration: days != null && days < 0 ? Math.abs(days) : undefined,
      lastPaymentDate: member?.lastPaymentDate,
      blockReason: member?.blockReason,
      rawQrCode: rpcResult.raw_qr_code ?? undefined,
      source,
    };
  };

  // A diferencia de simulateAccess (que parte de un memberId ya conocido), el
  // escáner global recibe el código crudo leído de un QR real — se valida tal
  // cual contra el mismo RPC (soporta el QR rotativo de la app móvil).
  const validateAccessCode: AppStore['validateAccessCode'] = async (code, source) => {
    const { data: rpcResult, error } = await supabase!
      .rpc('validate_access', { p_code: code, p_reader: 'Entrada principal' })
      .single<DbAccessLog>();

    if (error || !rpcResult) throw error ?? new Error('No se pudo validar el código escaneado');

    await Promise.all([invalidate('access-logs'), invalidate('members')]);

    const member = rpcResult.member_id ? members.find((m) => m.id === rpcResult.member_id) : undefined;
    const days = member?.expirationDate ? daysUntil(member.expirationDate) : undefined;
    const membership = member ? memberships.find((ms) => ms.id === member.membershipId) : undefined;

    return {
      id: rpcResult.id,
      gymId: rpcResult.gym_id,
      memberId: rpcResult.member_id ?? undefined,
      memberNumber: member?.memberNumber,
      memberName: member ? `${member.firstName} ${member.lastName}` : undefined,
      membershipName: membership?.name,
      result: rpcResult.result,
      timestamp: rpcResult.scanned_at,
      reader: rpcResult.reader,
      membershipExpirationDate: member?.expirationDate,
      daysUntilExpiration: days != null && days >= 0 ? days : undefined,
      daysSinceExpiration: days != null && days < 0 ? Math.abs(days) : undefined,
      lastPaymentDate: member?.lastPaymentDate,
      blockReason: member?.blockReason,
      rawQrCode: rpcResult.raw_qr_code ?? code,
      source,
    };
  };

  const resetDemoData: AppStore['resetDemoData'] = () => {
    // No-op: en modo Supabase los datos son reales, no hay nada que "restablecer".
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
        inventorySales,
        trainers,
        trainerAssignments,
        genericRoutines,
        isLoading,
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
        completeInventorySale,
        cancelInventorySale,
        assignTrainer,
        unassignTrainer,
        addGenericRoutine,
        updateGenericRoutine,
        deleteGenericRoutine,
        replaceRoutineExercises,
        simulateAccess,
        validateAccessCode,
        resetDemoData,
      }}>
      {children}
    </StoreContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Modo demo: mismo AppStore, respaldado por un estado en memoria + localStorage
// (ver lib/data/mock/seed.ts). Sin red, sin Supabase.
// ----------------------------------------------------------------------------
function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<DemoState>(() => loadDemoState());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setState(loadDemoState());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) saveDemoState(state);
  }, [state, isLoading]);

  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;

  const updateGym: AppStore['updateGym'] = async (updates) => {
    setState((s) => ({ ...s, gym: { ...s.gym, ...updates } }));
  };

  const addMember: AppStore['addMember'] = async (input) => {
    let created!: Member;
    setState((s) => {
      const existingNumbers = s.members
        .map((m) => parseInt(m.memberNumber.split('-').pop() ?? '0', 10))
        .filter((n) => !isNaN(n));
      const nextNumber = `${s.gym.memberPrefix}-${String(Math.max(0, ...existingNumbers) + 1).padStart(5, '0')}`;
      created = {
        id: `mem_${Date.now()}`,
        gymId: s.gym.id,
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
        lastPaymentDate: input.lastPaymentDate,
        mobileAppStatus: 'not_activated',
        emergencyContact: input.emergencyContact,
        emergencyPhone: input.emergencyPhone,
        notes: input.notes,
        createdAt: new Date().toISOString(),
        createdBy: userName ?? '',
      };
      return { ...s, members: [created, ...s.members] };
    });
    return created;
  };

  const updateMember: AppStore['updateMember'] = async (id, updates) => {
    setState((s) => ({
      ...s,
      members: s.members.map((m) => {
        if (m.id !== id) return m;
        const next: Member = { ...m };
        if ('status' in updates) next.status = updates.status!;
        if ('membershipId' in updates) next.membershipId = updates.membershipId!;
        if ('expirationDate' in updates) next.expirationDate = updates.expirationDate ?? '';
        if ('lastPaymentDate' in updates) next.lastPaymentDate = updates.lastPaymentDate;
        if ('blockedAt' in updates) next.blockedAt = updates.blockedAt;
        if ('blockedBy' in updates) next.blockedBy = updates.blockedBy ? userName : undefined;
        if ('blockReason' in updates) next.blockReason = updates.blockReason;
        if ('temporaryAccessUntil' in updates) next.temporaryAccessUntil = updates.temporaryAccessUntil;
        if ('temporaryAccessBy' in updates) next.temporaryAccessBy = updates.temporaryAccessBy ? userName : undefined;
        if ('temporaryAccessReason' in updates) next.temporaryAccessReason = updates.temporaryAccessReason;
        if ('mobileAppStatus' in updates) next.mobileAppStatus = updates.mobileAppStatus!;
        if ('activationCode' in updates) next.activationCode = updates.activationCode ? randomCode() : undefined;
        if ('notes' in updates) next.notes = updates.notes;
        return next;
      }),
    }));
  };

  const addPayment: AppStore['addPayment'] = async (input) => {
    let created!: Payment;
    setState((s) => {
      created = {
        id: input.id ?? `pay_${Date.now()}`,
        gymId: s.gym.id,
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
        registeredBy: input.registeredBy ?? userName ?? '',
      };
      return { ...s, payments: [created, ...s.payments] };
    });
    return created;
  };

  const cancelPayment: AppStore['cancelPayment'] = async (id, _label, reason) => {
    setState((s) => ({
      ...s,
      payments: s.payments.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'cancelled',
              cancelledBy: userName,
              cancelReason: reason,
              cancelledAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  };

  const addAccessLog: AppStore['addAccessLog'] = async (log) => {
    setState((s) => ({
      ...s,
      accessLogs: [
        {
          id: `acc_${Date.now()}`,
          gymId: s.gym.id,
          result: 'manual',
          timestamp: new Date().toISOString(),
          reader: 'Entrada principal',
          ...log,
        } as AccessLog,
        ...s.accessLogs,
      ],
    }));
  };

  const addMembership: AppStore['addMembership'] = async (input) => {
    let created!: Membership;
    setState((s) => {
      created = {
        id: `ms_${Date.now()}`,
        gymId: s.gym.id,
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
      return { ...s, memberships: [...s.memberships, created] };
    });
    return created;
  };

  const updateMembership: AppStore['updateMembership'] = async (id, updates) => {
    setState((s) => ({
      ...s,
      memberships: s.memberships.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const addStaff: AppStore['addStaff'] = async (input) => {
    // Mismas reglas que el provider de Supabase: el Super Admin no se crea
    // manualmente, y solo puede haber una cuenta activa por rol.
    if (input.role === 'super_admin') {
      throw new Error('El Super Admin no se crea manualmente desde Personal.');
    }
    if (input.role === 'admin' || input.role === 'receptionist') {
      if (state.staff.some((s) => s.role === input.role && s.active)) {
        throw new Error(`Ya existe una cuenta activa con el rol ${input.role === 'admin' ? 'administrador' : 'recepcionista'} en este gimnasio.`);
      }
    }

    const tempPassword = randomCode(12);
    setState((s) => {
      if (input.role === 'trainer') {
        const trainer: Trainer = {
          id: `trainer_${Date.now()}`,
          gymId: s.gym.id,
          firstName: input.firstName ?? '',
          lastName: input.lastName ?? '',
          phone: input.phone ?? '',
        };
        return { ...s, trainers: [...s.trainers, trainer] };
      }
      const newStaff: Staff = {
        id: `staff_${Date.now()}`,
        gymId: s.gym.id,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        email: input.email ?? '',
        phone: input.phone,
        role: input.role as Staff['role'],
        active: true,
        paymentsRegistered: 0,
        actionsCount: 0,
        createdAt: new Date().toISOString(),
      };
      return { ...s, staff: [...s.staff, newStaff] };
    });
    return { tempPassword };
  };

  const updateStaff: AppStore['updateStaff'] = async (id, updates) => {
    const target = state.staff.find((s) => s.id === id);
    if (target?.isContractHolder && (updates.role !== undefined || updates.active !== undefined)) {
      throw new Error('El Super Admin no puede desactivarse ni cambiar de rol.');
    }
    setState((s) => ({
      ...s,
      staff: s.staff.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    }));
  };

  const addInventoryItem: AppStore['addInventoryItem'] = (item) => {
    setState((s) => ({ ...s, inventory: [item, ...s.inventory] }));
  };

  const updateInventoryItem: AppStore['updateInventoryItem'] = (id, updates) => {
    setState((s) => ({
      ...s,
      inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  };

  const deleteInventoryItem: AppStore['deleteInventoryItem'] = (id) => {
    setState((s) => ({ ...s, inventory: s.inventory.filter((i) => i.id !== id) }));
  };

  const completeInventorySale: AppStore['completeInventorySale'] = async ({ items: lines, method, memberId, notes }) => {
    if (lines.length === 0) throw new Error('El carrito está vacío.');

    // Validación de TODAS las líneas antes de mutar nada — si una falla, se
    // lanza y setState nunca corre (nada de descuentos parciales). Al vivir
    // en un único setState funcional, la escritura sí es atómica en modo demo.
    const resolved = lines.map(({ itemId, quantity }) => {
      const item = state.inventory.find((i) => i.id === itemId);
      if (!item) throw new Error('Uno de los productos del carrito ya no existe.');
      if (item.status !== 'operating') throw new Error(`${item.name} no está disponible para venta.`);
      if (quantity <= 0) throw new Error(`La cantidad de ${item.name} debe ser mayor a cero.`);
      if (item.quantity <= 0 || quantity > item.quantity) {
        throw new Error(`No hay existencias suficientes de ${item.name} para completar la venta.`);
      }
      // ALTA-10 (QA_AUDIT_REPORT_GYM.md): un salePrice negativo (fallo de
      // ALTA-09 en el origen) no debe poder venderse — generaría un total
      // negativo que se suma tal cual a los ingresos reportados.
      if (item.salePrice === undefined || item.salePrice <= 0) throw new Error(`${item.name} no tiene un precio de venta válido.`);
      return { item, quantity };
    });

    const member = memberId ? state.members.find((m) => m.id === memberId) : undefined;
    const saleItems: SaleItem[] = resolved.map(({ item, quantity }) => ({
      productId: item.id,
      productName: item.name,
      barcode: item.sku,
      quantity,
      unitPrice: item.salePrice!,
      subtotal: item.salePrice! * quantity,
    }));
    const total = saleItems.reduce((s, i) => s + i.subtotal, 0);

    const sale: InventorySale = {
      id: `isale_${Date.now()}`,
      gymId: state.gym.id,
      items: saleItems,
      subtotal: total,
      total,
      method,
      status: 'confirmed',
      soldAt: new Date().toISOString(),
      registeredBy: userName ?? 'Recepción',
      memberId: member?.id,
      memberName: member ? `${member.firstName} ${member.lastName}` : undefined,
      notes,
    };

    setState((s) => ({
      ...s,
      inventory: s.inventory.map((i) => {
        const line = resolved.find((r) => r.item.id === i.id);
        return line ? { ...i, quantity: i.quantity - line.quantity } : i;
      }),
      inventorySales: [sale, ...s.inventorySales],
    }));
    return sale;
  };

  const cancelInventorySale: AppStore['cancelInventorySale'] = async (id, cancelledByLabel, reason) => {
    setState((s) => {
      const sale = s.inventorySales.find((x) => x.id === id);
      if (!sale || sale.status === 'cancelled') return s;
      return {
        ...s,
        inventory: s.inventory.map((i) => {
          const line = sale.items.find((l) => l.productId === i.id);
          return line ? { ...i, quantity: i.quantity + line.quantity } : i;
        }),
        inventorySales: s.inventorySales.map((x) =>
          x.id === id ? { ...x, status: 'cancelled', cancelledBy: cancelledByLabel, cancelReason: reason, cancelledAt: new Date().toISOString() } : x
        ),
      };
    });
  };

  const assignTrainer: AppStore['assignTrainer'] = async (clientId, trainerId) => {
    setState((s) => ({
      ...s,
      trainerAssignments: [
        ...s.trainerAssignments.filter((a) => a.clientId !== clientId),
        { id: `ta_${Date.now()}`, trainerId, clientId, assignedAt: new Date().toISOString() },
      ],
    }));
  };

  const unassignTrainer: AppStore['unassignTrainer'] = async (clientId) => {
    setState((s) => ({
      ...s,
      trainerAssignments: s.trainerAssignments.filter((a) => a.clientId !== clientId),
    }));
  };

  const addGenericRoutine: AppStore['addGenericRoutine'] = async (input) => {
    let created!: Routine;
    setState((s) => {
      created = {
        id: `rt_${Date.now()}`,
        title: input.title,
        goal: input.goal,
        createdAt: new Date().toISOString(),
        exercises: [],
      };
      return { ...s, genericRoutines: [created, ...s.genericRoutines] };
    });
    return created;
  };

  const updateGenericRoutine: AppStore['updateGenericRoutine'] = async (id, updates) => {
    setState((s) => ({
      ...s,
      genericRoutines: s.genericRoutines.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  };

  const deleteGenericRoutine: AppStore['deleteGenericRoutine'] = async (id) => {
    setState((s) => ({ ...s, genericRoutines: s.genericRoutines.filter((r) => r.id !== id) }));
  };

  const replaceRoutineExercises: AppStore['replaceRoutineExercises'] = async (routineId, exercises) => {
    setState((s) => ({
      ...s,
      genericRoutines: s.genericRoutines.map((r) =>
        r.id === routineId
          ? {
              ...r,
              exercises: exercises.map((e, index) => ({
                ...e,
                id: `rte_${Date.now()}_${index}`,
                routineId,
                orderIndex: index,
              })),
            }
          : r
      ),
    }));
  };

  const simulateAccess: AppStore['simulateAccess'] = async (memberId, source) => {
    const member = memberId ? state.members.find((m) => m.id === memberId) : undefined;
    const membership = member ? state.memberships.find((ms) => ms.id === member.membershipId) : undefined;
    const days = member?.expirationDate ? daysUntil(member.expirationDate) : undefined;

    // getAccessResultFromMemberStatus mapea MemberStatus -> AccessResult (son
    // uniones distintas: "active" no es un AccessResult, su equivalente es
    // "authorized"). Antes esto se casteaba directo y rompía cualquier
    // componente que indexara por AccessResult para un miembro activo.
    const result: AccessLog['result'] = !member ? 'invalid_qr' : getAccessResultFromMemberStatus(member.status);

    const log: AccessLog = {
      id: `acc_${Date.now()}`,
      gymId: state.gym.id,
      memberId: member?.id,
      memberNumber: member?.memberNumber,
      memberName: member ? `${member.firstName} ${member.lastName}` : undefined,
      membershipName: membership?.name,
      result,
      timestamp: new Date().toISOString(),
      reader: 'Entrada principal',
      membershipExpirationDate: member?.expirationDate,
      daysUntilExpiration: days != null && days >= 0 ? days : undefined,
      daysSinceExpiration: days != null && days < 0 ? Math.abs(days) : undefined,
      lastPaymentDate: member?.lastPaymentDate,
      blockReason: member?.blockReason,
      rawQrCode: member ? undefined : `QR-SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      source,
    };

    setState((s) => ({ ...s, accessLogs: [log, ...s.accessLogs] }));
    return log;
  };

  // En modo demo el QR de un miembro codifica su memberNumber (ej. "AF-00001"),
  // que es el mismo identificador visible en su credencial/perfil.
  const validateAccessCode: AppStore['validateAccessCode'] = async (code, source) => {
    const trimmed = code.trim();
    const member = trimmed ? state.members.find((m) => m.memberNumber === trimmed) : undefined;
    if (!member) {
      const log: AccessLog = {
        id: `acc_${Date.now()}`,
        gymId: state.gym.id,
        result: 'invalid_qr',
        timestamp: new Date().toISOString(),
        reader: 'Entrada principal',
        rawQrCode: trimmed || undefined,
        source,
      };
      setState((s) => ({ ...s, accessLogs: [log, ...s.accessLogs] }));
      return log;
    }
    return simulateAccess(member.id, source);
  };

  const resetDemoData: AppStore['resetDemoData'] = () => {
    clearDemoState();
    setState(buildSeedState());
  };

  return (
    <StoreContext.Provider
      value={{
        gym: state.gym,
        members: state.members,
        payments: state.payments,
        accessLogs: state.accessLogs,
        memberships: state.memberships,
        staff: state.staff,
        inventory: state.inventory,
        inventorySales: state.inventorySales,
        trainers: state.trainers,
        trainerAssignments: state.trainerAssignments,
        genericRoutines: state.genericRoutines,
        isLoading,
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
        completeInventorySale,
        cancelInventorySale,
        assignTrainer,
        unassignTrainer,
        addGenericRoutine,
        updateGenericRoutine,
        deleteGenericRoutine,
        replaceRoutineExercises,
        simulateAccess,
        validateAccessCode,
        resetDemoData,
      }}>
      {children}
    </StoreContext.Provider>
  );
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return isDemoMode() ? (
    <MockStoreProvider>{children}</MockStoreProvider>
  ) : (
    <SupabaseStoreProvider>{children}</SupabaseStoreProvider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
