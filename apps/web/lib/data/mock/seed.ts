import { accessLogs as seedAccessLogs } from '@/data/accesses';
import { gyms } from '@/data/gyms';
import { inventory as seedInventory } from '@/data/inventory';
import { inventorySales as seedInventorySales } from '@/data/inventorySales';
import { members as seedMembers } from '@/data/members';
import { memberships as seedMemberships } from '@/data/memberships';
import { payments as seedPayments } from '@/data/payments';
import { genericRoutines as seedGenericRoutines } from '@/data/routines';
import { staff as seedStaff } from '@/data/staff';
import { trainerAssignments as seedTrainerAssignments, trainers as seedTrainers } from '@/data/trainers';
import type {
  AccessLog,
  Gym,
  InventoryItem,
  InventorySale,
  Member,
  Membership,
  Payment,
  Routine,
  Staff,
  Trainer,
  TrainerAssignment,
} from '@/types';

export interface DemoState {
  gym: Gym;
  members: Member[];
  payments: Payment[];
  accessLogs: AccessLog[];
  memberships: Membership[];
  staff: Staff[];
  inventory: InventoryItem[];
  inventorySales: InventorySale[];
  trainers: Trainer[];
  trainerAssignments: TrainerAssignment[];
  genericRoutines: Routine[];
}

// Clave de localStorage — el sufijo de versión permite invalidar datos
// guardados por una versión anterior del seed sin tener que migrarlos.
// v2: se agregó inventorySales y Trainer.phone reemplazó a Trainer.email.
// v3: InventorySale pasó de una venta = un producto a una venta = items[].
export const DEMO_STATE_STORAGE_KEY = 'demo_gym_state_v3';

// Copia profunda de la data importada: el seed original nunca debe mutarse,
// para que "Restablecer datos demo" siempre vuelva al mismo punto de partida.
export function buildSeedState(): DemoState {
  return structuredClone({
    gym: gyms[0],
    members: seedMembers,
    payments: seedPayments,
    accessLogs: seedAccessLogs,
    memberships: seedMemberships,
    staff: seedStaff,
    inventory: seedInventory,
    inventorySales: seedInventorySales,
    trainers: seedTrainers,
    trainerAssignments: seedTrainerAssignments,
    genericRoutines: seedGenericRoutines,
  });
}

export function loadDemoState(): DemoState {
  if (typeof window === 'undefined') return buildSeedState();
  try {
    const raw = window.localStorage.getItem(DEMO_STATE_STORAGE_KEY);
    if (!raw) return buildSeedState();
    return JSON.parse(raw) as DemoState;
  } catch {
    return buildSeedState();
  }
}

export function saveDemoState(state: DemoState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEMO_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function clearDemoState() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_STATE_STORAGE_KEY);
}
