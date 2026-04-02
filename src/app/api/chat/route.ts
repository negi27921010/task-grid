import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/* ---- IST helper ---- */

function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ---- Intent classification ---- */

function classifyIntent(message: string): string[] {
  const lower = message.toLowerCase();
  const intents: string[] = [];

  const taskKw = ['task', 'todo', 'blocked', 'overdue', 'in progress', 'completed',
    'priority', 'p1', 'p2', 'p3', 'p4', 'assigned', 'eta', 'status', 'aging',
    'stale', 'blocker', 'done', 'pending', 'cancelled', 'progress'];
  const projKw = ['project', 'projects'];
  const standupKw = ['standup', 'stand-up', 'morning', 'evening', 'outcome',
    'closure', 'carried', 'daily standup', 'daily', 'yesterday', 'today',
    'history', 'last week', 'past', 'summary', 'submitted', 'stuck',
    'completion rate', 'not done', 'outcomes'];
  const teamKw = ['team', 'member', 'members', 'department', 'who',
    'everyone', 'colleague', 'people', 'user', 'users'];

  if (taskKw.some(k => lower.includes(k))) intents.push('tasks');
  if (projKw.some(k => lower.includes(k))) intents.push('projects');
  if (standupKw.some(k => lower.includes(k))) intents.push('standups');
  if (teamKw.some(k => lower.includes(k))) intents.push('team');

  if (intents.length === 0) intents.push('tasks', 'projects', 'general');
  return intents;
}

/* ---- Auth helper ---- */

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/* ---- Main handler ---- */

export async function POST(request: Request) {
  try {
    // 1. Check API key
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: 'AI chatbot is not configured. Add GROQ_API_KEY to environment variables.' },
        { status: 503 },
      );
    }

    // 2. Authenticate
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Please sign in to use the chatbot.' }, { status: 401 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Get user profile
    const { data: profile } = await adminClient
      .from('users')
      .select('id, full_name, email, role, department')
      .eq('email', authUser.email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    // 3. Parse request
    const { message, history = [] } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    // 4. Classify intent
    const intents = classifyIntent(message);
    const isAdminUser = profile.role === 'admin';

    // 5. Fetch context data
    const contextData: Record<string, unknown> = {};

    if (intents.includes('tasks')) {
      let taskQuery = adminClient
        .from('tasks')
        .select('id, title, status, priority, owner_id, assignee_ids, eta, started_at, completed_at, blocker_reason, project_id, depth, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(80);

      if (!isAdminUser) {
        taskQuery = taskQuery.or(`owner_id.eq.${profile.id},assignee_ids.cs.{${profile.id}}`);
      }

      const { data: tasks } = await taskQuery;
      const taskList = tasks ?? [];

      // Compute summary
      const statusCounts: Record<string, number> = {};
      const priorityCounts: Record<string, number> = {};
      let overdueCount = 0;
      const now = new Date();

      for (const t of taskList) {
        const s = t.status as string;
        statusCounts[s] = (statusCounts[s] ?? 0) + 1;
        const p = t.priority as string;
        priorityCounts[p] = (priorityCounts[p] ?? 0) + 1;
        if (t.eta && new Date(t.eta as string) < now && s !== 'completed' && s !== 'cancelled') {
          overdueCount++;
        }
      }

      contextData.tasks = {
        total: taskList.length,
        by_status: statusCounts,
        by_priority: priorityCounts,
        overdue_count: overdueCount,
        items: taskList.slice(0, 50),
      };
    }

    if (intents.includes('projects')) {
      const { data: projects } = await adminClient
        .from('projects')
        .select('id, name, description, status, owner_id, start_date, target_date, created_at')
        .order('created_at', { ascending: false });

      contextData.projects = projects ?? [];

      // Get task counts per project
      if (contextData.projects) {
        const projIds = (projects ?? []).map(p => p.id as string);
        if (projIds.length > 0) {
          const { data: projTasks } = await adminClient
            .from('tasks')
            .select('project_id, status')
            .in('project_id', projIds);

          const projStats: Record<string, { total: number; completed: number }> = {};
          for (const t of projTasks ?? []) {
            const pid = t.project_id as string;
            if (!projStats[pid]) projStats[pid] = { total: 0, completed: 0 };
            projStats[pid].total++;
            if (t.status === 'completed') projStats[pid].completed++;
          }
          contextData.project_task_stats = projStats;
        }
      }
    }

    if (intents.includes('standups')) {
      const today = getTodayIST();

      if (isAdminUser) {
        // Fetch all standups for today
        const { data: standups } = await adminClient
          .from('daily_standups')
          .select('id, user_id, standup_date, morning_submitted_at, morning_is_late, dependencies_risks, evening_submitted_at, evening_is_late, evening_notes')
          .eq('standup_date', today);

        const standupList = standups ?? [];
        const standupIds = standupList.map(s => s.id as string);

        let outcomes: Record<string, unknown>[] = [];
        if (standupIds.length > 0) {
          const { data: oRows } = await adminClient
            .from('standup_outcomes')
            .select('standup_id, outcome_text, is_carried, carry_streak, evening_status, reason_not_done')
            .in('standup_id', standupIds);
          outcomes = oRows ?? [];
        }

        // Get user names
        const userIds = standupList.map(s => s.user_id as string);
        const { data: standupUsers } = await adminClient
          .from('users')
          .select('id, full_name')
          .in('id', userIds.length > 0 ? userIds : ['__none__']);

        const userMap: Record<string, string> = {};
        for (const u of standupUsers ?? []) {
          userMap[u.id as string] = u.full_name as string;
        }

        // Get all users for "who hasn't submitted"
        const { data: allUsers } = await adminClient
          .from('users')
          .select('id, full_name, department');

        const submittedUserIds = new Set(standupList.map(s => s.user_id as string));
        const notSubmitted = (allUsers ?? []).filter(u => !submittedUserIds.has(u.id as string));

        contextData.standups_today = {
          date: today,
          submitted: standupList.map(s => ({
            ...s,
            user_name: userMap[s.user_id as string] ?? 'Unknown',
            outcomes: outcomes.filter(o => (o.standup_id as string) === (s.id as string)),
          })),
          not_submitted: notSubmitted.map(u => ({ id: u.id, full_name: u.full_name, department: u.department })),
        };

        // Past 7 days history (summary per day)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().slice(0, 10);

        const { data: pastStandups } = await adminClient
          .from('daily_standups')
          .select('id, user_id, standup_date, morning_submitted_at, morning_is_late, evening_submitted_at, evening_is_late')
          .gte('standup_date', weekAgoStr)
          .lt('standup_date', today)
          .order('standup_date', { ascending: false });

        if (pastStandups && pastStandups.length > 0) {
          const pastIds = pastStandups.map(s => s.id as string);
          const { data: pastOutcomes } = await adminClient
            .from('standup_outcomes')
            .select('standup_id, outcome_text, evening_status, is_carried, carry_streak, reason_not_done')
            .in('standup_id', pastIds);

          contextData.standups_history = pastStandups.map(s => ({
            ...s,
            user_name: userMap[s.user_id as string] ?? 'Unknown',
            outcomes: (pastOutcomes ?? []).filter(o => (o.standup_id as string) === (s.id as string)),
          }));
        }
      } else {
        // Member: own standup today + past 7 days
        const { data: myStandup } = await adminClient
          .from('daily_standups')
          .select('*')
          .eq('user_id', profile.id)
          .eq('standup_date', today)
          .maybeSingle();

        if (myStandup) {
          const { data: myOutcomes } = await adminClient
            .from('standup_outcomes')
            .select('*')
            .eq('standup_id', myStandup.id as string);
          contextData.my_standup_today = { ...myStandup, outcomes: myOutcomes ?? [] };
        } else {
          contextData.my_standup_today = null;
        }

        // Past 7 days for member
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().slice(0, 10);

        const { data: myPastStandups } = await adminClient
          .from('daily_standups')
          .select('id, standup_date, morning_submitted_at, evening_submitted_at')
          .eq('user_id', profile.id as string)
          .gte('standup_date', weekAgoStr)
          .lt('standup_date', today)
          .order('standup_date', { ascending: false });

        if (myPastStandups && myPastStandups.length > 0) {
          const pastIds = myPastStandups.map(s => s.id as string);
          const { data: pastOutcomes } = await adminClient
            .from('standup_outcomes')
            .select('standup_id, outcome_text, evening_status, is_carried, carry_streak, reason_not_done')
            .in('standup_id', pastIds);

          contextData.my_standup_history = myPastStandups.map(s => ({
            ...s,
            outcomes: (pastOutcomes ?? []).filter(o => (o.standup_id as string) === (s.id as string)),
          }));
        }
      }
    }

    if (intents.includes('team')) {
      let userQuery = adminClient.from('users').select('id, full_name, email, role, department, created_at');
      if (!isAdminUser) {
        userQuery = userQuery.eq('department', profile.department as string);
      }
      const { data: teamUsers } = await userQuery;
      contextData.team_members = teamUsers ?? [];
    }

    if (intents.includes('general') && !contextData.tasks) {
      // Lightweight summary for general questions
      const { count: taskCount } = await adminClient
        .from('tasks')
        .select('*', { count: 'exact', head: true });
      const { count: projectCount } = await adminClient
        .from('projects')
        .select('*', { count: 'exact', head: true });
      const { count: userCount } = await adminClient
        .from('users')
        .select('*', { count: 'exact', head: true });

      contextData.summary = {
        total_tasks: taskCount ?? 0,
        total_projects: projectCount ?? 0,
        total_users: userCount ?? 0,
      };
    }

    // 6. Build system prompt
    const systemPrompt = `You are TaskFlow AI, an intelligent assistant for the TaskFlow project & task management platform.

Current user: ${profile.full_name} (${profile.email})
Role: ${profile.role}
Department: ${profile.department}
Current date: ${new Date().toISOString()}
IST date: ${getTodayIST()}

You help users understand their tasks, projects, daily standups, and team activity.
Answer based ONLY on the data provided below. If the data doesn't contain enough information, say so honestly.
Be concise and helpful. Use bullet points and bold for readability. Reference task titles and project names specifically.
When showing counts or statuses, format them clearly.
Do NOT make up data that isn't in the context.

=== DATA CONTEXT ===
${JSON.stringify(contextData, null, 2)}`;

    // 7. Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-5).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // 8. Call Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      let errorMsg = 'AI service error';
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error?.message ?? errorMsg;
      } catch { /* use default */ }
      return NextResponse.json({ error: errorMsg }, { status: groqResponse.status });
    }

    // 9. Stream response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqResponse.body!.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch { /* skip malformed chunks */ }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
