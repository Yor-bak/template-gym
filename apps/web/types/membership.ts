export type DurationUnit = 'days' | 'weeks' | 'months' | 'years';

export interface Membership {
  id: string;
  gymId: string;
  name: string;
  price: number;
  duration: number;
  durationUnit: DurationUnit;
  toleranceDays: number;
  description?: string;
  active: boolean;
  memberCount: number;
  createdAt: string;
}
