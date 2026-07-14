import { Trainer, TrainerAssignment } from '@/types';

export const trainers: Trainer[] = [
  { id: 'trainer_001', gymId: 'gym_001', firstName: 'Héctor', lastName: 'Ramírez Solís', phone: '55 1212 3434' },
  { id: 'trainer_002', gymId: 'gym_001', firstName: 'Adriana', lastName: 'Beltrán Cano', phone: '55 2323 4545' },
  { id: 'trainer_003', gymId: 'gym_001', firstName: 'Tomás', lastName: 'Villareal Ponce', phone: '55 3434 5656' },
  { id: 'trainer_004', gymId: 'gym_001', firstName: 'Ximena', lastName: 'Cordero Salas', phone: '55 4545 6767' },
  { id: 'trainer_005', gymId: 'gym_001', firstName: 'Bruno', lastName: 'Escamilla Duarte', phone: '55 5656 7878' },
];

// Especialidad y horario son metadatos sólo de UI/demo — no existen todavía
// como columnas reales en `profiles`, por eso viven aparte del tipo Trainer.
export const trainerSpecialties: Record<string, string> = {
  trainer_001: 'Fuerza e hipertrofia',
  trainer_002: 'Acondicionamiento funcional',
  trainer_003: 'Pérdida de peso',
  trainer_004: 'Movilidad y rehabilitación',
  trainer_005: 'Alto rendimiento / CrossFit',
};

export const trainerSchedules: Record<string, string> = {
  trainer_001: 'Lun-Vie 6:00-14:00',
  trainer_002: 'Lun-Vie 14:00-22:00',
  trainer_003: 'Mar-Sáb 7:00-15:00',
  trainer_004: 'Lun-Vie 9:00-17:00',
  trainer_005: 'Lun-Sáb 6:00-12:00',
};

export const trainerAssignments: TrainerAssignment[] = [
  { id: 'ta_001', trainerId: 'trainer_001', clientId: 'mem_001', assignedAt: '2026-06-05T10:00:00Z' },
  { id: 'ta_002', trainerId: 'trainer_001', clientId: 'mem_005', assignedAt: '2026-06-10T10:00:00Z' },
  { id: 'ta_003', trainerId: 'trainer_001', clientId: 'mem_026', assignedAt: '2026-06-12T10:00:00Z' },
  { id: 'ta_004', trainerId: 'trainer_002', clientId: 'mem_002', assignedAt: '2026-06-06T10:00:00Z' },
  { id: 'ta_005', trainerId: 'trainer_002', clientId: 'mem_006', assignedAt: '2026-06-08T10:00:00Z' },
  { id: 'ta_006', trainerId: 'trainer_003', clientId: 'mem_003', assignedAt: '2026-06-01T10:00:00Z' },
  { id: 'ta_007', trainerId: 'trainer_003', clientId: 'mem_010', assignedAt: '2026-06-03T10:00:00Z' },
  { id: 'ta_008', trainerId: 'trainer_003', clientId: 'mem_034', assignedAt: '2026-06-15T10:00:00Z' },
  { id: 'ta_009', trainerId: 'trainer_004', clientId: 'mem_004', assignedAt: '2026-07-01T10:00:00Z' },
  { id: 'ta_010', trainerId: 'trainer_005', clientId: 'mem_008', assignedAt: '2026-02-01T10:00:00Z' },
  { id: 'ta_011', trainerId: 'trainer_005', clientId: 'mem_028', assignedAt: '2026-02-05T10:00:00Z' },
];
