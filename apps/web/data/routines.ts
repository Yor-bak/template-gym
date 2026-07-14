import { Routine } from '@/types';

export const genericRoutines: Routine[] = [
  {
    id: 'rt_001',
    title: 'Fuerza general - principiante',
    goal: 'Adaptación anatómica, 3 días por semana',
    createdAt: '2026-06-01T10:00:00Z',
    exercises: [
      { id: 'rte_001', routineId: 'rt_001', name: 'Sentadilla goblet', sets: 3, reps: '12', restSeconds: 60, orderIndex: 0 },
      { id: 'rte_002', routineId: 'rt_001', name: 'Press banca mancuerna', sets: 3, reps: '10', restSeconds: 60, orderIndex: 1 },
      { id: 'rte_003', routineId: 'rt_001', name: 'Remo con barra', sets: 3, reps: '10', restSeconds: 60, orderIndex: 2 },
    ],
  },
  {
    id: 'rt_002',
    title: 'Hipertrofia - intermedio',
    goal: 'Ganancia muscular, 4 días por semana',
    createdAt: '2026-06-10T10:00:00Z',
    exercises: [
      { id: 'rte_004', routineId: 'rt_002', name: 'Peso muerto rumano', sets: 4, reps: '8', restSeconds: 90, orderIndex: 0 },
      { id: 'rte_005', routineId: 'rt_002', name: 'Press militar', sets: 4, reps: '8', restSeconds: 90, orderIndex: 1 },
    ],
  },
];
