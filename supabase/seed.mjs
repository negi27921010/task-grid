import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://wuxkcrbarsutnvxzzmly.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1eGtjcmJhcnN1dG52eHp6bWx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAyMjg2NiwiZXhwIjoyMDg3NTk4ODY2fQ.E7I2mEL_Te1gSAQUK7USmhgbBTxceawEpU-NCdJCEkg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TS = '2026-03-30T00:00:00Z';

// ── USERS ──
const users = [
  { id: 'user-admin-1', email: 'shubham.negi@pw.live', full_name: 'Shubham Negi', avatar_url: null, role: 'admin', department: 'Administration', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-admin-2', email: 'saksham.agarwal@pw.live', full_name: 'Saksham Agarwal', avatar_url: null, role: 'admin', department: 'Administration', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-3', email: 'ayush.satyam@pw.live', full_name: 'Ayush Satyam', avatar_url: null, role: 'member', department: 'Finance Operations', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-4', email: 'aditya.tiwari@pw.live', full_name: 'Aditya Nath Tiwari', avatar_url: null, role: 'member', department: 'Business Operations', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-5', email: 'pramod.yadav@pw.live', full_name: 'Pramod Yadav', avatar_url: null, role: 'member', department: 'Business Operations', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-6', email: 'sanjeev.kumar@pw.live', full_name: 'Sanjeev Kumar', avatar_url: null, role: 'member', department: 'Business Operations', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-7', email: 'disha.katkhede@pw.live', full_name: 'Disha Rajendra Katkhede', avatar_url: null, role: 'member', department: 'Finance Operations', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-8', email: 'jayashree.bera@pw.live', full_name: 'Jayashree Bera', avatar_url: null, role: 'member', department: 'Sales', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-9', email: 'ankit.shukla@pw.live', full_name: 'Ankit Shukla', avatar_url: null, role: 'member', department: 'Product & Analytics', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-10', email: 'ayush.gautam@pw.live', full_name: 'Ayush Gautam', avatar_url: null, role: 'member', department: 'Category Management', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-11', email: 'amrit.sampatram@pw.live', full_name: 'Amrit Sampatram', avatar_url: null, role: 'member', department: 'Category Management', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-12', email: 'rohit.kumar@pw.live', full_name: 'Rohit Kumar', avatar_url: null, role: 'member', department: 'Business Operations', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-13', email: 'ritikh.mehta@pw.live', full_name: 'Ritikh Mehta', avatar_url: null, role: 'member', department: 'Product & Analytics', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-14', email: 'naman.narang@pw.live', full_name: 'Naman Narang', avatar_url: null, role: 'member', department: 'Product & Analytics', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-15', email: 'yash@pw.live', full_name: 'Yash', avatar_url: null, role: 'member', department: 'Product & Analytics', created_at: '2026-03-01T00:00:00Z' },
  { id: 'user-16', email: 'ashish@pw.live', full_name: 'Ashish', avatar_url: null, role: 'member', department: 'Business Operations', created_at: '2026-03-30T00:00:00Z' },
];

// ── PROJECTS ──
const projects = [
  { id: 'proj-clm', name: 'Customer Lifecycle Management', description: 'End-to-end customer lifecycle tracking — acquisition, onboarding, engagement, retention, and win-back workflows.', status: 'active', owner_id: 'user-admin-1', start_date: '2026-03-01', target_date: null, created_at: '2026-03-01T00:00:00Z' },
  { id: 'proj-tp', name: 'Test Prep', description: 'Test preparation operations — content scheduling, batch management, student performance tracking, and result analysis.', status: 'active', owner_id: 'user-admin-1', start_date: '2026-03-01', target_date: null, created_at: '2026-03-01T00:00:00Z' },
  { id: 'proj-k8', name: 'K8', description: 'K8 vertical operations — curriculum planning, teacher coordination, content delivery, and student engagement for classes K–8.', status: 'active', owner_id: 'user-admin-2', start_date: '2026-03-01', target_date: null, created_at: '2026-03-01T00:00:00Z' },
];

// ── TASKS (import from the seed file) ──
// We re-use the same data structure from mock-data/tasks.ts
function t(projectId, id, parentId, title, ownerId, depth, position, path, tags = [], description = '', eta = null) {
  return {
    id, project_id: projectId, parent_id: parentId, title, description,
    status: 'not_started', priority: depth === 0 ? 'P2' : 'P3',
    owner_id: ownerId, eta, started_at: null, completed_at: null,
    blocker_reason: null, depth, position, path, tags,
    estimated_hours: null, actual_hours: null,
    remarks: null, labels: [],
    created_at: TS, updated_at: TS,
  };
}

const SAKSHAM = 'user-admin-2';
const SHUBHAM = 'user-admin-1';
const AMRIT = 'user-11';
const YASH = 'user-15';
const RITIKH = 'user-13';
const ASHISH = 'user-16';
const JAYASHREE = 'user-8';
const NAMAN = 'user-14';
const AYUSH_G = 'user-10';

const TP = 'proj-tp';
const CLM = 'proj-clm';

const tasks = [
  // ═══ TEST PREP ═══
  t(TP, 'tp-hiring', null, 'Hiring', SAKSHAM, 0, 0, '/tp-hiring', ['hiring']),
  t(TP, 'tp-hiring-intel', 'tp-hiring', 'Hiring Intelligence', SAKSHAM, 1, 0, '/tp-hiring/tp-hiring-intel', ['hiring', 'intelligence']),
  t(TP, 'tp-hiring-intel-1', 'tp-hiring-intel', 'Analyze past sales, attrition, Potential by area', SAKSHAM, 2, 0, '/tp-hiring/tp-hiring-intel/tp-hiring-intel-1', ['hiring', 'analysis']),
  t(TP, 'tp-hiring-expect', 'tp-hiring', 'Hiring Expectation', SAKSHAM, 1, 1, '/tp-hiring/tp-hiring-expect', ['hiring']),
  t(TP, 'tp-hiring-expect-1', 'tp-hiring-expect', 'Classify role type (Hunter / Farmer / Distributor builder)', SAKSHAM, 2, 0, '/tp-hiring/tp-hiring-expect/tp-hiring-expect-1', ['hiring', 'classification']),
  t(TP, 'tp-hiring-pipeline', 'tp-hiring', 'Hiring Requirement & Pipeline', SAKSHAM, 1, 2, '/tp-hiring/tp-hiring-pipeline', ['hiring', 'pipeline']),
  t(TP, 'tp-hiring-pipeline-1', 'tp-hiring-pipeline', 'Define requisition (count + location + role)', SAKSHAM, 2, 0, '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-1', ['hiring', 'requisition']),
  t(TP, 'tp-hiring-pipeline-2', 'tp-hiring-pipeline', 'Source candidates (daily pipeline build)', AMRIT, 2, 1, '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-2', ['hiring', 'sourcing']),
  t(TP, 'tp-hiring-pipeline-3', 'tp-hiring-pipeline', 'Conduct interviews (screening → final)', AMRIT, 2, 2, '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-3', ['hiring', 'interviews']),
  t(TP, 'tp-hiring-pipeline-4', 'tp-hiring-pipeline', 'Offer rollout & joining tracking', SHUBHAM, 2, 3, '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-4', ['hiring', 'onboarding']),
  t(TP, 'tp-hiring-pipeline-5', 'tp-hiring-pipeline', 'Escalation on delay (3 days)', SAKSHAM, 2, 4, '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-5', ['hiring', 'escalation']),
  t(TP, 'tp-revenue', null, 'Revenue Planning', SAKSHAM, 0, 1, '/tp-revenue', ['revenue']),
  t(TP, 'tp-revenue-targets', 'tp-revenue', 'Monthly Targets', SAKSHAM, 1, 0, '/tp-revenue/tp-revenue-targets', ['revenue', 'targets']),
  t(TP, 'tp-revenue-targets-1', 'tp-revenue-targets', 'Define total revenue target', SAKSHAM, 2, 0, '/tp-revenue/tp-revenue-targets/tp-revenue-targets-1', ['revenue']),
  t(TP, 'tp-revenue-targets-2', 'tp-revenue-targets', 'Rep-wise breakdown', ASHISH, 2, 1, '/tp-revenue/tp-revenue-targets/tp-revenue-targets-2', ['revenue']),
  t(TP, 'tp-revenue-activity', 'tp-revenue', 'Activity Mapping', ASHISH, 1, 1, '/tp-revenue/tp-revenue-activity', ['revenue', 'activity']),
  t(TP, 'tp-revenue-activity-1', 'tp-revenue-activity', 'Convert target → outlets × billing × frequency', ASHISH, 2, 0, '/tp-revenue/tp-revenue-activity/tp-revenue-activity-1', ['revenue', 'mapping']),
  t(TP, 'tp-revenue-weekly', 'tp-revenue', 'Weekly Revenue Tracking', ASHISH, 1, 2, '/tp-revenue/tp-revenue-weekly', ['revenue', 'tracking']),
  t(TP, 'tp-revenue-weekly-1', 'tp-revenue-weekly', 'Track revenue vs target', ASHISH, 2, 0, '/tp-revenue/tp-revenue-weekly/tp-revenue-weekly-1', ['revenue', 'tracking']),
  t(TP, 'tp-revenue-weekly-2', 'tp-revenue-weekly', 'Identify lagging reps / regions', ASHISH, 2, 1, '/tp-revenue/tp-revenue-weekly/tp-revenue-weekly-2', ['revenue', 'analysis']),
  t(TP, 'tp-revenue-weekly-3', 'tp-revenue-weekly', 'Corrective actions (offers / push / focus shift)', ASHISH, 2, 2, '/tp-revenue/tp-revenue-weekly/tp-revenue-weekly-3', ['revenue', 'actions']),
  t(TP, 'tp-marketing', null, 'Marketing Calendar', AMRIT, 0, 2, '/tp-marketing', ['marketing']),
  t(TP, 'tp-marketing-prelaunch', 'tp-marketing', 'Pre-Launch', AMRIT, 1, 0, '/tp-marketing/tp-marketing-prelaunch', ['marketing', 'pre-launch']),
  t(TP, 'tp-marketing-prelaunch-1', 'tp-marketing-prelaunch', 'SKU rollout plan (date, region, quantity)', AMRIT, 2, 0, '/tp-marketing/tp-marketing-prelaunch/tp-marketing-prelaunch-1', ['marketing', 'sku']),
  t(TP, 'tp-marketing-prelaunch-2', 'tp-marketing-prelaunch', 'Posters & creatives ready', AMRIT, 2, 1, '/tp-marketing/tp-marketing-prelaunch/tp-marketing-prelaunch-2', ['marketing', 'creatives']),
  t(TP, 'tp-marketing-prelaunch-3', 'tp-marketing-prelaunch', 'Team & distributor training', AMRIT, 2, 2, '/tp-marketing/tp-marketing-prelaunch/tp-marketing-prelaunch-3', ['marketing', 'training']),
  t(TP, 'tp-marketing-push', 'tp-marketing', 'Push Sales', AMRIT, 1, 1, '/tp-marketing/tp-marketing-push', ['marketing', 'push-sales']),
  t(TP, 'tp-marketing-push-1', 'tp-marketing-push', 'Quantity discount schemes', AMRIT, 2, 0, '/tp-marketing/tp-marketing-push/tp-marketing-push-1', ['marketing', 'discounts']),
  t(TP, 'tp-marketing-push-2', 'tp-marketing-push', 'Pre-order campaigns', AMRIT, 2, 1, '/tp-marketing/tp-marketing-push/tp-marketing-push-2', ['marketing', 'campaigns']),
  t(TP, 'tp-marketing-push-3', 'tp-marketing-push', 'Retail/Distributor incentives', AMRIT, 2, 2, '/tp-marketing/tp-marketing-push/tp-marketing-push-3', ['marketing', 'incentives']),
  t(TP, 'tp-marketing-clear', 'tp-marketing', 'Clear Slow Stock', AMRIT, 1, 2, '/tp-marketing/tp-marketing-clear', ['marketing', 'stock']),
  t(TP, 'tp-marketing-clear-1', 'tp-marketing-clear', 'Identify slow SKUs', AMRIT, 2, 0, '/tp-marketing/tp-marketing-clear/tp-marketing-clear-1', ['marketing', 'sku']),
  t(TP, 'tp-marketing-clear-2', 'tp-marketing-clear', 'Clearance schemes (bundle / discount)', AMRIT, 2, 1, '/tp-marketing/tp-marketing-clear/tp-marketing-clear-2', ['marketing', 'clearance']),
  t(TP, 'tp-marketing-clear-3', 'tp-marketing-clear', 'Track liquidation progress', AMRIT, 2, 2, '/tp-marketing/tp-marketing-clear/tp-marketing-clear-3', ['marketing', 'tracking']),
  t(TP, 'tp-sampling', null, 'Sampling', SHUBHAM, 0, 3, '/tp-sampling', ['sampling']),
  t(TP, 'tp-sampling-policy', 'tp-sampling', 'Policy Definition', SHUBHAM, 1, 0, '/tp-sampling/tp-sampling-policy', ['sampling', 'policy']),
  t(TP, 'tp-sampling-policy-1', 'tp-sampling-policy', 'Define SKU-wise cap', SHUBHAM, 2, 0, '/tp-sampling/tp-sampling-policy/tp-sampling-policy-1', ['sampling']),
  t(TP, 'tp-sampling-tracking', 'tp-sampling', 'Tracking', SHUBHAM, 1, 1, '/tp-sampling/tp-sampling-tracking', ['sampling', 'tracking']),
  t(TP, 'tp-sampling-tracking-1', 'tp-sampling-tracking', 'Track sample issued', SHUBHAM, 2, 0, '/tp-sampling/tp-sampling-tracking/tp-sampling-tracking-1', ['sampling']),
  t(TP, 'tp-sampling-tracking-2', 'tp-sampling-tracking', 'Map sample → conversion', SHUBHAM, 2, 1, '/tp-sampling/tp-sampling-tracking/tp-sampling-tracking-2', ['sampling', 'conversion']),
  t(TP, 'tp-sampling-control', 'tp-sampling', 'Control', SHUBHAM, 1, 2, '/tp-sampling/tp-sampling-control', ['sampling', 'control']),
  t(TP, 'tp-sampling-control-1', 'tp-sampling-control', 'Block over-ordering', SHUBHAM, 2, 0, '/tp-sampling/tp-sampling-control/tp-sampling-control-1', ['sampling']),
  t(TP, 'tp-systemtech', null, 'System & Tech', YASH, 0, 4, '/tp-systemtech', ['tech']),
  t(TP, 'tp-tech-data', 'tp-systemtech', 'Data Layer', RITIKH, 1, 0, '/tp-systemtech/tp-tech-data', ['tech', 'data']),
  t(TP, 'tp-tech-data-1', 'tp-tech-data', 'Build Retail Universe DB', RITIKH, 2, 0, '/tp-systemtech/tp-tech-data/tp-tech-data-1', ['tech', 'database']),
  t(TP, 'tp-tech-data-2', 'tp-tech-data', 'Distributor mapping', RITIKH, 2, 1, '/tp-systemtech/tp-tech-data/tp-tech-data-2', ['tech', 'mapping']),
  t(TP, 'tp-tech-dashboard', 'tp-systemtech', 'Dashboard', YASH, 1, 1, '/tp-systemtech/tp-tech-dashboard', ['tech', 'dashboard']),
  t(TP, 'tp-tech-dashboard-1', 'tp-tech-dashboard', 'Hiring dashboard', YASH, 2, 0, '/tp-systemtech/tp-tech-dashboard/tp-tech-dashboard-1', ['tech', 'dashboard']),
  t(TP, 'tp-tech-dashboard-2', 'tp-tech-dashboard', 'Sales dashboard', SHUBHAM, 2, 1, '/tp-systemtech/tp-tech-dashboard/tp-tech-dashboard-2', ['tech', 'dashboard']),
  t(TP, 'tp-tech-dashboard-3', 'tp-tech-dashboard', 'Sampling dashboard', YASH, 2, 2, '/tp-systemtech/tp-tech-dashboard/tp-tech-dashboard-3', ['tech', 'dashboard']),
  t(TP, 'tp-tech-ops', 'tp-systemtech', 'Ops Execution', YASH, 1, 2, '/tp-systemtech/tp-tech-ops', ['tech', 'ops']),
  t(TP, 'tp-tech-ops-1', 'tp-tech-ops', 'CRM + Inventory + Ops sync + Task management system', YASH, 2, 0, '/tp-systemtech/tp-tech-ops/tp-tech-ops-1', ['tech', 'crm', 'ops']),
  t(TP, 'tp-tech-auto', 'tp-systemtech', 'Automation', YASH, 1, 3, '/tp-systemtech/tp-tech-auto', ['tech', 'automation']),
  t(TP, 'tp-tech-auto-1', 'tp-tech-auto', 'Alerts (low sales / hiring delay)', YASH, 2, 0, '/tp-systemtech/tp-tech-auto/tp-tech-auto-1', ['tech', 'alerts']),
  t(TP, 'tp-capability', null, 'Capability', AMRIT, 0, 5, '/tp-capability', ['capability', 'training']),
  t(TP, 'tp-capability-training', 'tp-capability', 'Training', AMRIT, 1, 0, '/tp-capability/tp-capability-training', ['capability', 'training']),
  t(TP, 'tp-capability-training-1', 'tp-capability-training', 'New hire onboarding', AMRIT, 2, 0, '/tp-capability/tp-capability-training/tp-capability-training-1', ['training', 'onboarding']),
  t(TP, 'tp-capability-training-2', 'tp-capability-training', 'Product training', AMRIT, 2, 1, '/tp-capability/tp-capability-training/tp-capability-training-2', ['training', 'product']),
  t(TP, 'tp-capability-market', 'tp-capability', 'Market Training', AMRIT, 1, 1, '/tp-capability/tp-capability-market', ['capability', 'market-training']),
  t(TP, 'tp-capability-market-1', 'tp-capability-market', 'Distributor training', AMRIT, 2, 0, '/tp-capability/tp-capability-market/tp-capability-market-1', ['training', 'distributor']),
  t(TP, 'tp-capability-market-2', 'tp-capability-market', 'Retail awareness', AMRIT, 2, 1, '/tp-capability/tp-capability-market/tp-capability-market-2', ['training', 'retail']),

  // ═══ CUSTOMER LIFECYCLE MANAGEMENT ═══
  t(CLM, 'clm-onboarding', null, 'Onboarding', JAYASHREE, 0, 0, '/clm-onboarding', ['onboarding']),
  t(CLM, 'clm-onb-bulk', 'clm-onboarding', 'Bulk Orders - School Identification', JAYASHREE, 1, 0, '/clm-onboarding/clm-onb-bulk', ['onboarding', 'schools']),
  t(CLM, 'clm-onb-bulk-1', 'clm-onb-bulk', 'Calling the Sales team & Distributor for School information', JAYASHREE, 2, 0, '/clm-onboarding/clm-onb-bulk/clm-onb-bulk-1', ['onboarding', 'calling']),
  t(CLM, 'clm-onb-mails', 'clm-onboarding', 'Onboarding Mails bulk', NAMAN, 1, 1, '/clm-onboarding/clm-onb-mails', ['onboarding', 'email']),
  t(CLM, 'clm-onb-mails-1', 'clm-onb-mails', 'Bulk Onboarding Welcome Email Campaign with 3 Follow ups', NAMAN, 2, 0, '/clm-onboarding/clm-onb-mails/clm-onb-mails-1', ['onboarding', 'email', 'campaign']),
  t(CLM, 'clm-onb-calling', 'clm-onboarding', 'Onboarding Calling', JAYASHREE, 1, 2, '/clm-onboarding/clm-onb-calling', ['onboarding', 'calling']),
  t(CLM, 'clm-onb-calling-1', 'clm-onb-calling', 'School Onboarding Calling for Teachers details and QBG access', JAYASHREE, 2, 0, '/clm-onboarding/clm-onb-calling/clm-onb-calling-1', ['onboarding', 'calling', 'qbg']),
  t(CLM, 'clm-onb-qbg', 'clm-onboarding', 'Giving QBG Access', JAYASHREE, 1, 3, '/clm-onboarding/clm-onb-qbg', ['onboarding', 'qbg']),
  t(CLM, 'clm-onb-qbg-1', 'clm-onb-qbg', 'QBG Access data maintenance and tracking', JAYASHREE, 2, 0, '/clm-onboarding/clm-onb-qbg/clm-onb-qbg-1', ['onboarding', 'qbg', 'tracking']),
  t(CLM, 'clm-onb-followup', 'clm-onboarding', 'Follow-up and RAC Intro Mails', JAYASHREE, 1, 4, '/clm-onboarding/clm-onb-followup', ['onboarding', 'follow-up']),
  t(CLM, 'clm-onb-followup-1', 'clm-onb-followup', 'Final Call scheduling with the Schools for Regional Academic Lead Intro', JAYASHREE, 2, 0, '/clm-onboarding/clm-onb-followup/clm-onb-followup-1', ['onboarding', 'scheduling']),
  t(CLM, 'clm-onb-gifting', 'clm-onboarding', 'Finalizing Gifting', AYUSH_G, 1, 5, '/clm-onboarding/clm-onb-gifting', ['onboarding', 'gifting'], '', '2026-06-30T00:00:00Z'),
  t(CLM, 'clm-onb-harddrive', 'clm-onboarding', 'Harddrive for Offline distribution of Digital content', AYUSH_G, 1, 6, '/clm-onboarding/clm-onb-harddrive', ['onboarding', 'digital-content']),
  t(CLM, 'clm-onb-pmview', 'clm-onboarding', 'Adding PM-view in the Dashboard', AYUSH_G, 1, 7, '/clm-onboarding/clm-onb-pmview', ['onboarding', 'dashboard']),
  t(CLM, 'clm-prodtech', null, 'Product & Tech', NAMAN, 0, 1, '/clm-prodtech', ['product', 'tech']),
  t(CLM, 'clm-pt-telecall', 'clm-prodtech', 'Telecalling Email Dashboard', NAMAN, 1, 0, '/clm-prodtech/clm-pt-telecall', ['tech', 'dashboard']),
  t(CLM, 'clm-pt-telecall-1', 'clm-pt-telecall', 'Creating a complete Management dashboard with visibility on Calling Email metrics', NAMAN, 2, 0, '/clm-prodtech/clm-pt-telecall/clm-pt-telecall-1', ['tech', 'dashboard', 'metrics']),
  t(CLM, 'clm-pt-pmroute', 'clm-prodtech', 'PM Route planning', NAMAN, 1, 1, '/clm-prodtech/clm-pt-pmroute', ['tech', 'routing']),
  t(CLM, 'clm-curriculum', null, 'Curriculum & PM', AYUSH_G, 0, 2, '/clm-curriculum', ['curriculum', 'pm']),
  t(CLM, 'clm-cur-training', 'clm-curriculum', 'Finalizing Training Topics', AYUSH_G, 1, 0, '/clm-curriculum/clm-cur-training', ['curriculum', 'training'], '', '2026-04-01T00:00:00Z'),
  t(CLM, 'clm-cur-pmdecks', 'clm-curriculum', 'Finalizing PM Intro Decks', AYUSH_G, 1, 1, '/clm-curriculum/clm-cur-pmdecks', ['curriculum', 'decks'], '', '2026-04-07T00:00:00Z'),
  t(CLM, 'clm-cur-proddecks', 'clm-curriculum', 'Finalizing Product Adoption Decks', AYUSH_G, 1, 2, '/clm-curriculum/clm-cur-proddecks', ['curriculum', 'product-adoption'], '', '2026-04-07T00:00:00Z'),
  t(CLM, 'clm-cur-feedback', 'clm-curriculum', 'Feedback forms for Product Adoption trainings', AYUSH_G, 1, 3, '/clm-curriculum/clm-cur-feedback', ['curriculum', 'feedback'], '', '2026-04-07T00:00:00Z'),
  t(CLM, 'clm-cur-dashboard', 'clm-curriculum', 'Dashboard - School Details', AYUSH_G, 1, 4, '/clm-curriculum/clm-cur-dashboard', ['curriculum', 'dashboard'], '', '2026-04-07T00:00:00Z'),
  t(CLM, 'clm-cur-pmcycle', 'clm-curriculum', 'Finalizing PM-Area cycle', AYUSH_G, 1, 5, '/clm-curriculum/clm-cur-pmcycle', ['curriculum', 'pm-cycle'], '', '2026-04-07T00:00:00Z'),
  t(CLM, 'clm-cur-pmroute', 'clm-curriculum', 'PM Route planning', AYUSH_G, 1, 6, '/clm-curriculum/clm-cur-pmroute', ['curriculum', 'routing'], '', '2026-04-01T00:00:00Z'),
  t(CLM, 'clm-cur-monitor', 'clm-curriculum', 'Monitoring PM trainings', AYUSH_G, 1, 7, '/clm-curriculum/clm-cur-monitor', ['curriculum', 'monitoring'], '', '2026-04-07T00:00:00Z'),
  t(CLM, 'clm-school', null, 'School & Categorisation', AYUSH_G, 0, 3, '/clm-school', ['school', 'categorisation']),
  t(CLM, 'clm-sch-bucket', 'clm-school', 'List of schools - Bucketing', AYUSH_G, 1, 0, '/clm-school/clm-sch-bucket', ['school', 'bucketing']),
  t(CLM, 'clm-sch-bucket-1', 'clm-sch-bucket', 'Priority Assigned', AYUSH_G, 2, 0, '/clm-school/clm-sch-bucket/clm-sch-bucket-1', ['school', 'priority']),
  t(CLM, 'clm-sch-bucket-2', 'clm-sch-bucket', 'Categorization of schools', AYUSH_G, 2, 1, '/clm-school/clm-sch-bucket/clm-sch-bucket-2', ['school', 'categorization']),
  t(CLM, 'clm-sch-lifecycle', 'clm-school', "School's lifecycle checklist", AYUSH_G, 1, 1, '/clm-school/clm-sch-lifecycle', ['school', 'lifecycle']),
  t(CLM, 'clm-sch-lifecycle-1', 'clm-sch-lifecycle', 'Digital content', AYUSH_G, 2, 0, '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-1', ['lifecycle']),
  t(CLM, 'clm-sch-lifecycle-2', 'clm-sch-lifecycle', 'TC&LP', AYUSH_G, 2, 1, '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-2', ['lifecycle']),
  t(CLM, 'clm-sch-lifecycle-3', 'clm-sch-lifecycle', 'QBG Access', AYUSH_G, 2, 2, '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-3', ['lifecycle', 'qbg']),
  t(CLM, 'clm-sch-lifecycle-4', 'clm-sch-lifecycle', 'No. of Trainings', AYUSH_G, 2, 3, '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-4', ['lifecycle', 'training']),
  t(CLM, 'clm-sch-lifecycle-5', 'clm-sch-lifecycle', 'Retention Potential', AYUSH_G, 2, 4, '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-5', ['lifecycle', 'retention']),
  t(CLM, 'clm-sch-lifecycle-6', 'clm-sch-lifecycle', 'Strength', AYUSH_G, 2, 5, '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-6', ['lifecycle']),
  t(CLM, 'clm-sch-lifecycle-7', 'clm-sch-lifecycle', 'Rev Potential', AYUSH_G, 2, 6, '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-7', ['lifecycle', 'revenue']),
  t(CLM, 'clm-sch-traindecks', 'clm-school', 'Training Decks', AYUSH_G, 1, 2, '/clm-school/clm-sch-traindecks', ['school', 'training']),
  t(CLM, 'clm-sch-proddecks', 'clm-school', 'Product Adoption Decks', AYUSH_G, 1, 3, '/clm-school/clm-sch-proddecks', ['school', 'product-adoption']),
  t(CLM, 'clm-sch-feedback', 'clm-school', 'Feedback forms', AYUSH_G, 1, 4, '/clm-school/clm-sch-feedback', ['school', 'feedback']),
];

const DEFAULT_PASSWORD = 'TaskGrid@2026';

async function createAuthAccounts() {
  console.log('Creating Supabase Auth accounts...');
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.email) { skipped++; continue; }
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.full_name, role: user.role },
    });
    if (error) {
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        skipped++;
      } else {
        console.error(`  ✗ ${user.email}: ${error.message}`);
      }
    } else {
      created++;
    }
  }
  console.log(`  ✓ ${created} created, ${skipped} already existed`);
}

async function seed() {
  console.log('Seeding users...');
  const { error: userErr } = await supabase.from('users').upsert(users, { onConflict: 'id' });
  if (userErr) { console.error('Users error:', userErr); return; }
  console.log(`  ✓ ${users.length} users`);

  console.log('Seeding projects...');
  const { error: projErr } = await supabase.from('projects').upsert(projects, { onConflict: 'id' });
  if (projErr) { console.error('Projects error:', projErr); return; }
  console.log(`  ✓ ${projects.length} projects`);

  console.log('Seeding tasks (root first, then children)...');
  const roots = tasks.filter(t => t.parent_id === null);
  const depth1 = tasks.filter(t => t.depth === 1);
  const depth2 = tasks.filter(t => t.depth === 2);

  const { error: rootErr } = await supabase.from('tasks').upsert(roots, { onConflict: 'id' });
  if (rootErr) { console.error('Root tasks error:', rootErr); return; }
  console.log(`  ✓ ${roots.length} root tasks`);

  const { error: d1Err } = await supabase.from('tasks').upsert(depth1, { onConflict: 'id' });
  if (d1Err) { console.error('Depth 1 tasks error:', d1Err); return; }
  console.log(`  ✓ ${depth1.length} subtasks`);

  const { error: d2Err } = await supabase.from('tasks').upsert(depth2, { onConflict: 'id' });
  if (d2Err) { console.error('Depth 2 tasks error:', d2Err); return; }
  console.log(`  ✓ ${depth2.length} microtasks`);

  await createAuthAccounts();

  console.log(`\nDone! Total: ${users.length} users, ${projects.length} projects, ${tasks.length} tasks`);
  console.log(`Default password for all accounts: ${DEFAULT_PASSWORD}`);
}

seed().catch(console.error);
