export type TimeBlock = 'morning' | 'afternoon' | 'evening';

export interface Task {
  id: number;
  userId: number;
  content: string;
  completed: number; // 0 = false, 1 = true
  date: string; // YYYY-MM-DD
  timeBlock: TimeBlock;
  sortOrder: number;
  createdAt: number;
  updatedAt: Date;
}

export interface Note {
  id: number;
  userId: number;
  weekId: string; // Format: YYYY-Www (e.g., 2026-W03)
  content: string | null;
  createdAt: number;
  updatedAt: Date;
}
