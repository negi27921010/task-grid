// Idempotent check: returns exit 0 if migration 007 is applied (effort_hours
// column exists on standup_outcomes), exit 1 if not, exit 2 on connectivity
// errors. Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from process.env.

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

const { error } = await supabase
  .from('standup_outcomes')
  .select('effort_hours')
  .limit(1);

if (!error) {
  console.log('✓ Migration 007 applied — effort_hours column exists.');
  process.exit(0);
}

if (
  /column .*effort_hours.* does not exist/i.test(error.message) ||
  /could not find the .effort_hours. column/i.test(error.message)
) {
  console.log('✗ Migration 007 NOT applied — effort_hours column is missing.');
  process.exit(1);
}

console.error(`Connectivity / auth error: ${error.message}`);
process.exit(2);
