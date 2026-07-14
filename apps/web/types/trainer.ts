export interface Trainer {
  id: string;
  gymId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface TrainerAssignment {
  id: string;
  trainerId: string;
  clientId: string;
  assignedAt: string;
}
