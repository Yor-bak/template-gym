import { Trainer, TrainerAssignment } from '@/types';

export const trainers: Trainer[] = [
  {
    id: 'trn_001',
    gymId: 'gym_001',
    firstName: 'Óscar',
    lastName: 'Ramírez Kim',
    email: 'oscar.trainer@americanfitness.mx',
    phone: '55 2211 3344',
  },
  {
    id: 'trn_002',
    gymId: 'gym_001',
    firstName: 'Fernanda',
    lastName: 'Luna Cabrera',
    email: 'fernanda.trainer@americanfitness.mx',
    phone: '55 3322 4455',
  },
];

export const trainerAssignments: TrainerAssignment[] = [
  { id: 'ta_001', trainerId: 'trn_001', clientId: 'mem_001', assignedAt: '2026-06-05T10:00:00Z' },
  { id: 'ta_002', trainerId: 'trn_001', clientId: 'mem_003', assignedAt: '2026-06-10T10:00:00Z' },
  { id: 'ta_003', trainerId: 'trn_002', clientId: 'mem_005', assignedAt: '2026-06-12T10:00:00Z' },
];
