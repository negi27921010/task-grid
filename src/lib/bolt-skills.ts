// Bolt Skills — composable, named prompts users invoke via `/<name>`.
//
// Two skill kinds:
//   prompt — fills the chat input with a templated message, user can edit
//            and send. The existing /api/chat handler does the rest.
//   action — triggers a UI action in the widget itself (e.g. open the
//            memory panel). No LLM call.
//
// Skills are visible to roles in `roles`; the widget filters by current
// user role before showing autocomplete. 'all' means everyone.
//
// Why file-based: no DB row, no admin UI to maintain, no migration when
// we add a skill. Trade-off: only devs can add skills. That's fine for
// now — most skills serve a workflow, not a user preference.

export type SkillKind = 'prompt' | 'action';
export type SkillRole = 'all' | 'admin' | 'member';

export interface BoltSkill {
  name: string;            // slash command, no leading slash
  label: string;           // human-readable in autocomplete
  description: string;     // one-liner under the label
  kind: SkillKind;
  // For 'prompt' skills: the message text to send. Plain string for now;
  // future versions can support {placeholders} that prompt the user.
  prompt?: string;
  // For 'action' skills: the action key. Widget interprets this.
  action?: 'open-memory-panel';
  roles: SkillRole[];
}

// Kept compact and outcome-oriented — each skill maps to a question Bolt
// already knows how to answer well given its existing data context.
export const BOLT_SKILLS: BoltSkill[] = [
  {
    name: 'my-tasks',
    label: 'My open tasks',
    description: 'Lists my open tasks, sorted by priority and ETA.',
    kind: 'prompt',
    prompt:
      'Show me my open tasks (status: not_started or in_progress). Sort by priority (P1 first) then by ETA. For each: title, status, priority, ETA, and whether it\'s overdue. Skip cancelled and completed.',
    roles: ['all'],
  },
  {
    name: 'overdue',
    label: 'Overdue across team',
    description: 'Everything overdue, grouped by owner.',
    kind: 'prompt',
    prompt:
      'Show me every task that is OVERDUE right now (eta < today AND status not in [completed, cancelled]) across the entire team. Group by owner name. For each owner: bulleted list of their overdue tasks with title, priority, ETA, and how many days late.',
    roles: ['admin'],
  },
  {
    name: 'overdue',
    label: 'My overdue',
    description: 'My overdue tasks only.',
    kind: 'prompt',
    prompt:
      'Show me my OVERDUE tasks (eta < today AND status not in [completed, cancelled]). For each: title, priority, ETA, days late. If none, say so explicitly.',
    roles: ['member'],
  },
  {
    name: 'standup-status',
    label: "Today's standup status",
    description: 'Who has / hasn\'t filled today\'s standup.',
    kind: 'prompt',
    prompt:
      'For TODAY (IST), tell me: (1) who has submitted morning standup, (2) who hasn\'t, (3) for those who submitted, list their morning outcomes. Be specific — name people.',
    roles: ['admin'],
  },
  {
    name: 'standup-status',
    label: 'My standup today',
    description: 'My standup status for today.',
    kind: 'prompt',
    prompt:
      'Did I submit my morning standup today? If yes, summarize what I committed to. If no, remind me to fill it. Also tell me what I had carried from yesterday.',
    roles: ['member'],
  },
  {
    name: 'team-load',
    label: 'Team workload',
    description: 'Workload breakdown by member, flag overloaded.',
    kind: 'prompt',
    prompt:
      'Break down current workload by team member: total open tasks, P1/P2 count, overdue count. Sort by overdue count descending. Flag anyone with more than 5 P1/P2 tasks open as "overloaded".',
    roles: ['admin'],
  },
  {
    name: 'blockers',
    label: 'Blocked tasks',
    description: 'All blocked tasks with their blocker reason.',
    kind: 'prompt',
    prompt:
      'List every task with status=blocked. For each: title, owner name, blocker_reason (verbatim), how long it has been blocked. If a task has no blocker_reason, flag that explicitly.',
    roles: ['all'],
  },
  {
    name: 'digest',
    label: 'End-of-day digest',
    description: '5-bullet summary of what moved today.',
    kind: 'prompt',
    prompt:
      'Give me a tight 5-bullet end-of-day digest for today: tasks completed, tasks blocked/started, standup submission rate, biggest movement (most progress), biggest concern (most stalled). Use IST.',
    roles: ['all'],
  },
  {
    name: 'draft-eta-nudge',
    label: 'Draft an ETA nudge',
    description: 'Draft a polite ETA-update nudge message.',
    kind: 'prompt',
    prompt:
      'Help me draft a polite, short Slack/email nudge to a team member asking for an ETA update on a specific task. Ask me first: (1) which task, (2) which person, (3) tone (gentle / firm). Then draft 2 variations.',
    roles: ['all'],
  },
  {
    name: 'memory',
    label: 'What Bolt remembers',
    description: 'Inspect and forget what Bolt knows about you.',
    kind: 'action',
    action: 'open-memory-panel',
    roles: ['all'],
  },
];

// Filter the visible skills for the current user's role. 'admin' sees
// admin + all skills; 'member' sees member + all skills. When two skills
// share a name (e.g. /overdue), each role sees only the variant tagged
// for them.
export function visibleSkills(role: 'admin' | 'member'): BoltSkill[] {
  return BOLT_SKILLS.filter(s => s.roles.includes('all') || s.roles.includes(role));
}

// Match user-typed slash query against the visible set. Substring match
// on name + label. Returns top 8 to keep the autocomplete list scannable.
export function matchSkills(role: 'admin' | 'member', query: string): BoltSkill[] {
  const visible = visibleSkills(role);
  if (!query) return visible.slice(0, 8);
  const q = query.toLowerCase();
  return visible
    .filter(s => s.name.toLowerCase().includes(q) || s.label.toLowerCase().includes(q))
    .slice(0, 8);
}
