export type TimeBlock = 'morning' | 'afternoon' | 'evening';

export interface Task {
  id: number;
  userId: number;
  content: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  timeBlock: TimeBlock;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: number;
  userId: number;
  weekId: string; // Monday date, or a legacy week identifier.
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}
