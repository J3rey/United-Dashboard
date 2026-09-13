import type { Category } from './constants';

export type Id = string | number;
export type TransactionType = 'normal' | 'paid' | 'for';
export type ContentStatus = 'Idea' | 'Scripted' | 'Filmed' | 'Edited' | 'Posted';
export type Expense = { id: Id; date: string; cat: Category; detail: string; cost: number; type: TransactionType; person: string; isHeader?: false; isEnd?: false };
export type EventHeader = { id: Id; date: string; label: string; isHeader: true; isEnd?: false };
export type EventEnd = { id: Id; date: string; label: string; headerId?: Id | null; isEnd: true; isHeader?: false };
export type Transaction = Expense | EventHeader | EventEnd;
export type Income = { id: Id; date: string; source: string; amount: number; salary: boolean };
export type Debt = { id: Id; date: string; person: string; detail: string; amount: number; resolved: boolean; resolvedAt: string | null };
export type Habit = { id: Id; name: string; type: 'weekly' | 'daily'; goal: number; daily: boolean; archived?: boolean };
export type Pillar = { id: Id; name: string; colorIdx: number };
export type ContentItem = { id: Id; idea: string; pillarId: Id | null; status: ContentStatus; notes: string };
export type CalendarEvent = { id: Id; title: string; date: string; start: string; end: string; cat: string; notes: string };
export type AppState = {
  events: CalendarEvent[]; expenses: Transaction[]; income: Income[]; debts: Debt[]; habits: Habit[];
  habitChecks: Record<string, boolean>; habitWeekOffset: number;
  pillars: Pillar[]; content: ContentItem[]; contentFilter: Id | 'all'; nextId: number;
};

// Column names match the existing web queries; this declares types, not a migration.
export type TransactionRow = { id: Id; user_id: string; date: string; row_type: 'expense' | 'header' | 'end'; label: string; header_id: Id | null; cat: Category; detail: string; cost: number; tx_type: TransactionType; person: string | null; sort_order: number };
type IncomeRow = { id: Id; user_id: string; date: string; source: string; amount: number; is_salary: boolean };
type DebtRow = { id: Id; user_id: string; date: string; person: string; detail: string; amount: number; resolved: boolean; resolved_at: string | null; created_at: string };
type HabitRow = { id: Id; user_id: string; name: string; type: 'weekly' | 'daily'; goal: number; is_daily: boolean; archived: boolean | null; sort_order: number };
type HabitLogRow = { user_id: string; habit_id: Id; week_start: string; day_index: number; checked: boolean };
type PillarRow = { id: Id; user_id: string; name: string; color_idx: number; sort_order: number };
type ContentRow = { id: Id; user_id: string; idea: string; pillar_id: Id | null; status: ContentStatus; notes: string | null; sort_order: number };
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = { public: {
  Tables: {
    finance_transactions: Table<TransactionRow>; finance_income: Table<IncomeRow>; finance_debts: Table<DebtRow>;
    habits: Table<HabitRow>; habit_logs: Table<HabitLogRow>;
    content_pillars: Table<PillarRow>; content_items: Table<ContentRow>;
  };
  Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };
export type IncomeChanges = Partial<Pick<Income, 'date' | 'source' | 'amount' | 'salary'>>;
export type DebtChanges = Partial<Pick<Debt, 'date' | 'person' | 'detail' | 'amount' | 'resolved' | 'resolvedAt'>>;
export type HabitChanges = Partial<Pick<Habit, 'name' | 'goal' | 'archived'>>;
export type ContentChanges = Partial<Pick<ContentItem, 'idea' | 'pillarId' | 'status' | 'notes'>>;
export type TransactionChanges = Partial<Omit<Expense, 'id' | 'isHeader' | 'isEnd'>> & Partial<Pick<EventHeader, 'label'>>;
