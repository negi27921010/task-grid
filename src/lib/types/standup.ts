export type OutcomeEveningStatus = 'pending' | 'done' | 'not_done';

export interface StandupComment {
  id: string;
  outcome_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface StandupOutcome {
  id: string;
  standup_id: string;
  outcome_text: string;
  priority_order: number;
  is_carried: boolean;
  carried_from_outcome_id: string | null;
  carry_streak: number;
  evening_status: OutcomeEveningStatus;
  reason_not_done: string | null;
  closed_at: string | null;
  created_at: string;
  comments: StandupComment[];
}

export interface DailyStandup {
  id: string;
  user_id: string;
  standup_date: string;
  morning_submitted_at: string | null;
  morning_is_late: boolean;
  dependencies_risks: string | null;
  evening_submitted_at: string | null;
  evening_is_late: boolean;
  evening_notes: string | null;
  evening_auto_closed: boolean;
  created_at: string;
  outcomes: StandupOutcome[];
}

export interface CreateMorningStandupInput {
  user_id: string;
  standup_date: string;
  outcomes: { outcome_text: string; priority_order: number }[];
  carried_outcome_ids: string[];
  dependencies_risks?: string;
}

export interface UpdateMorningStandupInput {
  outcomes: { id?: string; outcome_text: string; priority_order: number }[];
  dependencies_risks?: string;
}

export interface EveningClosureInput {
  outcomes: { id: string; evening_status: OutcomeEveningStatus; reason_not_done?: string }[];
  evening_notes?: string;
}

export interface TeamStandupSummary {
  user_id: string;
  user_name: string;
  department: string;
  standup_date: string;
  morning_status: 'not_submitted' | 'submitted' | 'late';
  evening_status: 'not_submitted' | 'submitted' | 'late';
  total_outcomes: number;
  done_count: number;
  not_done_count: number;
  carried_count: number;
  stuck_count: number;
  completion_rate: number;
}
