import { Routine } from '@/types';

// Rutinas genéricas (sin cliente asignado), gestionadas desde el dashboard.
export const genericRoutines: Routine[] = [
  {
    id: 'rt_001',
    title: 'Full Body — Principiante',
    goal: 'Adaptación general y técnica de base',
    createdAt: '2026-01-10T10:00:00Z',
    exercises: [
      { id: 'rte_001', routineId: 'rt_001', name: 'Sentadilla goblet', sets: 3, reps: '12', restSeconds: 60, orderIndex: 0 },
      { id: 'rte_002', routineId: 'rt_001', name: 'Press de banca con mancuerna', sets: 3, reps: '10', restSeconds: 60, orderIndex: 1 },
      { id: 'rte_003', routineId: 'rt_001', name: 'Remo con barra', sets: 3, reps: '12', restSeconds: 60, orderIndex: 2 },
      { id: 'rte_004', routineId: 'rt_001', name: 'Plancha', sets: 3, reps: '30 seg', restSeconds: 45, orderIndex: 3, notes: 'Mantener cadera neutra' },
    ],
  },
  {
    id: 'rt_002',
    title: 'Hipertrofia — Push/Pull/Legs',
    goal: 'Ganancia de masa muscular',
    createdAt: '2026-02-05T10:00:00Z',
    exercises: [
      { id: 'rte_005', routineId: 'rt_002', name: 'Press militar', sets: 4, reps: '8-10', restSeconds: 90, orderIndex: 0 },
      { id: 'rte_006', routineId: 'rt_002', name: 'Fondos en paralelas', sets: 4, reps: '10', restSeconds: 90, orderIndex: 1 },
      { id: 'rte_007', routineId: 'rt_002', name: 'Peso muerto rumano', sets: 4, reps: '8', restSeconds: 120, orderIndex: 2 },
      { id: 'rte_008', routineId: 'rt_002', name: 'Sentadilla búlgara', sets: 3, reps: '10 c/pierna', restSeconds: 90, orderIndex: 3 },
    ],
  },
  {
    id: 'rt_003',
    title: 'Pérdida de peso — Circuito',
    goal: 'Déficit calórico y resistencia',
    createdAt: '2026-03-01T10:00:00Z',
    exercises: [
      { id: 'rte_009', routineId: 'rt_003', name: 'Burpees', sets: 4, reps: '15', restSeconds: 30, orderIndex: 0 },
      { id: 'rte_010', routineId: 'rt_003', name: 'Mountain climbers', sets: 4, reps: '30 seg', restSeconds: 30, orderIndex: 1 },
      { id: 'rte_011', routineId: 'rt_003', name: 'Kettlebell swing', sets: 4, reps: '15', restSeconds: 45, orderIndex: 2 },
      { id: 'rte_012', routineId: 'rt_003', name: 'Zancadas caminando', sets: 3, reps: '20 pasos', restSeconds: 45, orderIndex: 3, notes: 'Ritmo constante, sin pausas largas' },
    ],
  },
  {
    id: 'rt_004',
    title: 'Movilidad y rehabilitación',
    goal: 'Prevención de lesiones y movilidad articular',
    createdAt: '2026-04-15T10:00:00Z',
    exercises: [
      { id: 'rte_013', routineId: 'rt_004', name: 'Rotación externa de hombro con banda', sets: 3, reps: '15', restSeconds: 30, orderIndex: 0 },
      { id: 'rte_014', routineId: 'rt_004', name: 'Puente de glúteo', sets: 3, reps: '15', restSeconds: 30, orderIndex: 1 },
      { id: 'rte_015', routineId: 'rt_004', name: 'Estiramiento de cadera 90/90', sets: 3, reps: '30 seg c/lado', restSeconds: 20, orderIndex: 2 },
    ],
  },
];
