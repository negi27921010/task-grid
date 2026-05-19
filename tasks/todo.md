# Migrate scheduled standup emails: GH Actions → Supabase pg_cron + Edge Function

## Why
GitHub Actions scheduled triggers have been unreliable:
- Apr 27: morning slot fired ~2.5h late
- Apr 28: 1 of 4 runs failed (run 25060610440)
- Apr 29: morning slots didn't fire at all (recovered manually via `workflow_dispatch`)

Supabase pg_cron runs inside the same Postgres instance as our data — no
external runner queue, no shared CI capacity, no missed cron events.

## Architecture
```
Supabase pg_cron (UTC schedule, Mon–Sat)
   └─→ pg_net.http_post → Edge Function `cron-dispatch`
        └─→ Vercel /api/cron/dispatch?job=X&secret=… (existing endpoint, unchanged)
             └─→ existing job runners (morning, eta, defaulter, evening, evening-digest)
```

## Files in this PR
- [x] `supabase/functions/cron-dispatch/index.ts` — Edge Function (auth + Vercel call + multi-job loop)
- [x] `supabase/functions/cron-dispatch/deno.json` — Deno imports map
- [x] `supabase/config.toml` — pins project_id for `supabase functions deploy`
- [x] `supabase/migrations/008_pg_cron_standup_jobs.sql` — enables pg_cron+pg_net, schedules 4 slots
- [x] `.github/workflows/cron.yml` — `schedule:` commented out, `workflow_dispatch` retained as manual fallback
- [x] Manual trigger today's missed jobs (morning/eta/defaulter) — done at 12:15 IST

## Deploy steps (need user / dashboard access)

### 1. Set Edge Function secrets
Supabase dashboard → Project → Edge Functions → Manage secrets:
- `PROD_URL` = `https://taskflow-puce-nine.vercel.app`
- `CRON_SECRET` = same value as Vercel env (`vercel env pull` to confirm)
- `EDGE_SHARED_SECRET` = `0568cbcedc504bbf47611c4b575022c5cf6a2eebbdb947c412c52584359f9179`

### 2. Update migration with the secret
Replace `EDGE_SHARED_SECRET_PLACEHOLDER` in `008_pg_cron_standup_jobs.sql`
with the same `EDGE_SHARED_SECRET` value above (4 occurrences).

### 3. Deploy the Edge Function
```bash
cd taskflow
supabase login                   # one-time
supabase link --project-ref wuxkcrbarsutnvxzzmly   # one-time
supabase functions deploy cron-dispatch
```

### 4. Smoke-test the Edge Function
```bash
curl -i "https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch?secret=<EDGE_SHARED_SECRET>&job=morning"
```
Expect HTTP 200 with `{"ok":true,"results":[{"job":"morning","status":200,...}]}`.
A test email should land within ~30s.

### 5. Apply the pg_cron migration
Open Supabase dashboard → SQL Editor → paste contents of
`008_pg_cron_standup_jobs.sql` (with the secret filled in) → run.

Or via CLI:
```bash
supabase db push
```

### 6. Verify pg_cron jobs are scheduled
In SQL Editor:
```sql
select jobid, schedule, jobname, active
from cron.job
where jobname like 'standup_%'
order by schedule;
```
Should show 4 rows, all `active=true`.

### 7. Wait for next slot, confirm fire
After the next IST slot (10:30 AM, 11:00 AM, 6:00 PM, or 6:30 PM Mon–Sat):
```sql
select runid, jobid, status, return_message, start_time
from cron.job_run_details
order by start_time desc limit 10;

select id, status_code, content::text, created
from net._http_response
order by created desc limit 10;
```
- `cron.job_run_details.status` should be `succeeded`.
- `net._http_response.status_code` should be `200`.

### 8. Commit + push
Once verified end-to-end, push the branch. The commented `schedule:` in
GH Actions ensures GH won't double-send.

## Rollback
If the new path misbehaves: uncomment the `schedule:` block in
`.github/workflows/cron.yml`, push, and unschedule the pg_cron jobs:
```sql
select cron.unschedule(jobname) from cron.job where jobname like 'standup_%';
```

## Review

(Fill in after deploy verification.)
