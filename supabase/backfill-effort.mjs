// Idempotent backfill: ensures every standup_outcomes row has a non-null
// effort_hours, defaulting to 1.0. Safe to re-run.

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count: nullCount, error: cErr } = await supabase
  .from('standup_outcomes')
  .select('id', { count: 'exact', head: true })
  .is('effort_hours', null);
if (cErr) {
  console.error(`Count query failed: ${cErr.message}`);
  process.exit(2);
}

console.log(`Rows with NULL effort_hours: ${nullCount}`);

if (nullCount === 0) {
  console.log('✓ Backfill not needed — all rows have effort_hours.');
  process.exit(0);
}

const { error: uErr, data } = await supabase
  .from('standup_outcomes')
  .update({ effort_hours: 1.0 })
  .is('effort_hours', null)
  .select('id');
if (uErr) {
  console.error(`Backfill UPDATE failed: ${uErr.message}`);
  process.exit(2);
}

console.log(`✓ Backfilled ${data?.length ?? 0} rows to effort_hours = 1.0`);
process.exit(0);
