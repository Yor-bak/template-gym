export interface RoutineExercise {
  id: string;
  routineId: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  orderIndex: number;
  notes?: string;
}

export interface Routine {
  id: string;
  trainerId?: string;
  clientId?: string;
  title: string;
  goal?: string;
  createdAt: string;
  exercises: RoutineExercise[];
}
