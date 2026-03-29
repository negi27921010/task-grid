import type { Task } from '../types';

const TS = '2026-03-30T00:00:00Z';

// Owner ID shortcuts
const SAKSHAM = 'user-admin-2';
const SHUBHAM = 'user-admin-1';
const AMRIT = 'user-11';
const YASH = 'user-15';
const RITIKH = 'user-13';
const ASHISH = 'user-16';
const JAYASHREE = 'user-8';
const NAMAN = 'user-14';
const AYUSH_G = 'user-10';

function t(
  projectId: string,
  id: string,
  parentId: string | null,
  title: string,
  ownerId: string,
  depth: number,
  position: number,
  path: string,
  tags: string[] = [],
  description: string = '',
  eta: string | null = null,
): Task {
  return {
    id, project_id: projectId, parent_id: parentId, title, description,
    status: 'not_started', priority: depth === 0 ? 'P2' : 'P3',
    owner_id: ownerId, assignee_ids: [ownerId], eta, started_at: null, completed_at: null,
    blocker_reason: null, depth, position, path, tags,
    estimated_hours: null, actual_hours: null,
    remarks: null, comments: [], labels: [],
    created_at: TS, updated_at: TS,
  };
}

const TP = 'proj-tp';
const CLM = 'proj-clm';

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  PROJECT: TEST PREP (proj-tp)                                           ║
// ║  6 Main Tasks → 18 Subtasks → 37 Microtasks = 61 records               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const testPrepTasks: Task[] = [

  // ═══════════════════════════════════════════════════════════════
  // TASK 1: Hiring
  // ═══════════════════════════════════════════════════════════════
  t(TP, 'tp-hiring', null, 'Hiring', SAKSHAM, 0, 0, '/tp-hiring', ['hiring']),

  // Subtask 1.1: Hiring Intelligence
  t(TP, 'tp-hiring-intel', 'tp-hiring', 'Hiring Intelligence', SAKSHAM, 1, 0,
    '/tp-hiring/tp-hiring-intel', ['hiring', 'intelligence']),
  t(TP, 'tp-hiring-intel-1', 'tp-hiring-intel', 'Analyze past sales, attrition, Potential by area', SAKSHAM, 2, 0,
    '/tp-hiring/tp-hiring-intel/tp-hiring-intel-1', ['hiring', 'analysis']),

  // Subtask 1.2: Hiring Expectation
  t(TP, 'tp-hiring-expect', 'tp-hiring', 'Hiring Expectation', SAKSHAM, 1, 1,
    '/tp-hiring/tp-hiring-expect', ['hiring']),
  t(TP, 'tp-hiring-expect-1', 'tp-hiring-expect', 'Classify role type (Hunter / Farmer / Distributor builder)', SAKSHAM, 2, 0,
    '/tp-hiring/tp-hiring-expect/tp-hiring-expect-1', ['hiring', 'classification']),

  // Subtask 1.3: Hiring Requirement & Pipeline
  t(TP, 'tp-hiring-pipeline', 'tp-hiring', 'Hiring Requirement & Pipeline', SAKSHAM, 1, 2,
    '/tp-hiring/tp-hiring-pipeline', ['hiring', 'pipeline']),
  t(TP, 'tp-hiring-pipeline-1', 'tp-hiring-pipeline', 'Define requisition (count + location + role)', SAKSHAM, 2, 0,
    '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-1', ['hiring', 'requisition']),
  t(TP, 'tp-hiring-pipeline-2', 'tp-hiring-pipeline', 'Source candidates (daily pipeline build)', AMRIT, 2, 1,
    '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-2', ['hiring', 'sourcing']),
  t(TP, 'tp-hiring-pipeline-3', 'tp-hiring-pipeline', 'Conduct interviews (screening → final)', AMRIT, 2, 2,
    '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-3', ['hiring', 'interviews']),
  t(TP, 'tp-hiring-pipeline-4', 'tp-hiring-pipeline', 'Offer rollout & joining tracking', SHUBHAM, 2, 3,
    '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-4', ['hiring', 'onboarding']),
  t(TP, 'tp-hiring-pipeline-5', 'tp-hiring-pipeline', 'Escalation on delay (3 days)', SAKSHAM, 2, 4,
    '/tp-hiring/tp-hiring-pipeline/tp-hiring-pipeline-5', ['hiring', 'escalation']),

  // ═══════════════════════════════════════════════════════════════
  // TASK 2: Revenue Planning
  // ═══════════════════════════════════════════════════════════════
  t(TP, 'tp-revenue', null, 'Revenue Planning', SAKSHAM, 0, 1, '/tp-revenue', ['revenue']),

  // Subtask 2.1: Monthly Targets
  t(TP, 'tp-revenue-targets', 'tp-revenue', 'Monthly Targets', SAKSHAM, 1, 0,
    '/tp-revenue/tp-revenue-targets', ['revenue', 'targets']),
  t(TP, 'tp-revenue-targets-1', 'tp-revenue-targets', 'Define total revenue target', SAKSHAM, 2, 0,
    '/tp-revenue/tp-revenue-targets/tp-revenue-targets-1', ['revenue']),
  t(TP, 'tp-revenue-targets-2', 'tp-revenue-targets', 'Rep-wise breakdown', ASHISH, 2, 1,
    '/tp-revenue/tp-revenue-targets/tp-revenue-targets-2', ['revenue']),

  // Subtask 2.2: Activity Mapping
  t(TP, 'tp-revenue-activity', 'tp-revenue', 'Activity Mapping', ASHISH, 1, 1,
    '/tp-revenue/tp-revenue-activity', ['revenue', 'activity']),
  t(TP, 'tp-revenue-activity-1', 'tp-revenue-activity', 'Convert target → outlets × billing × frequency', ASHISH, 2, 0,
    '/tp-revenue/tp-revenue-activity/tp-revenue-activity-1', ['revenue', 'mapping']),

  // Subtask 2.3: Weekly Revenue Tracking
  t(TP, 'tp-revenue-weekly', 'tp-revenue', 'Weekly Revenue Tracking', ASHISH, 1, 2,
    '/tp-revenue/tp-revenue-weekly', ['revenue', 'tracking']),
  t(TP, 'tp-revenue-weekly-1', 'tp-revenue-weekly', 'Track revenue vs target', ASHISH, 2, 0,
    '/tp-revenue/tp-revenue-weekly/tp-revenue-weekly-1', ['revenue', 'tracking']),
  t(TP, 'tp-revenue-weekly-2', 'tp-revenue-weekly', 'Identify lagging reps / regions', ASHISH, 2, 1,
    '/tp-revenue/tp-revenue-weekly/tp-revenue-weekly-2', ['revenue', 'analysis']),
  t(TP, 'tp-revenue-weekly-3', 'tp-revenue-weekly', 'Corrective actions (offers / push / focus shift)', ASHISH, 2, 2,
    '/tp-revenue/tp-revenue-weekly/tp-revenue-weekly-3', ['revenue', 'actions']),

  // ═══════════════════════════════════════════════════════════════
  // TASK 3: Marketing Calendar
  // ═══════════════════════════════════════════════════════════════
  t(TP, 'tp-marketing', null, 'Marketing Calendar', AMRIT, 0, 2, '/tp-marketing', ['marketing']),

  // Subtask 3.1: Pre-Launch
  t(TP, 'tp-marketing-prelaunch', 'tp-marketing', 'Pre-Launch', AMRIT, 1, 0,
    '/tp-marketing/tp-marketing-prelaunch', ['marketing', 'pre-launch']),
  t(TP, 'tp-marketing-prelaunch-1', 'tp-marketing-prelaunch', 'SKU rollout plan (date, region, quantity)', AMRIT, 2, 0,
    '/tp-marketing/tp-marketing-prelaunch/tp-marketing-prelaunch-1', ['marketing', 'sku']),
  t(TP, 'tp-marketing-prelaunch-2', 'tp-marketing-prelaunch', 'Posters & creatives ready', AMRIT, 2, 1,
    '/tp-marketing/tp-marketing-prelaunch/tp-marketing-prelaunch-2', ['marketing', 'creatives']),
  t(TP, 'tp-marketing-prelaunch-3', 'tp-marketing-prelaunch', 'Team & distributor training', AMRIT, 2, 2,
    '/tp-marketing/tp-marketing-prelaunch/tp-marketing-prelaunch-3', ['marketing', 'training']),

  // Subtask 3.2: Push Sales
  t(TP, 'tp-marketing-push', 'tp-marketing', 'Push Sales', AMRIT, 1, 1,
    '/tp-marketing/tp-marketing-push', ['marketing', 'push-sales']),
  t(TP, 'tp-marketing-push-1', 'tp-marketing-push', 'Quantity discount schemes', AMRIT, 2, 0,
    '/tp-marketing/tp-marketing-push/tp-marketing-push-1', ['marketing', 'discounts']),
  t(TP, 'tp-marketing-push-2', 'tp-marketing-push', 'Pre-order campaigns', AMRIT, 2, 1,
    '/tp-marketing/tp-marketing-push/tp-marketing-push-2', ['marketing', 'campaigns']),
  t(TP, 'tp-marketing-push-3', 'tp-marketing-push', 'Retail/Distributor incentives', AMRIT, 2, 2,
    '/tp-marketing/tp-marketing-push/tp-marketing-push-3', ['marketing', 'incentives']),

  // Subtask 3.3: Clear Slow Stock
  t(TP, 'tp-marketing-clear', 'tp-marketing', 'Clear Slow Stock', AMRIT, 1, 2,
    '/tp-marketing/tp-marketing-clear', ['marketing', 'stock']),
  t(TP, 'tp-marketing-clear-1', 'tp-marketing-clear', 'Identify slow SKUs', AMRIT, 2, 0,
    '/tp-marketing/tp-marketing-clear/tp-marketing-clear-1', ['marketing', 'sku']),
  t(TP, 'tp-marketing-clear-2', 'tp-marketing-clear', 'Clearance schemes (bundle / discount)', AMRIT, 2, 1,
    '/tp-marketing/tp-marketing-clear/tp-marketing-clear-2', ['marketing', 'clearance']),
  t(TP, 'tp-marketing-clear-3', 'tp-marketing-clear', 'Track liquidation progress', AMRIT, 2, 2,
    '/tp-marketing/tp-marketing-clear/tp-marketing-clear-3', ['marketing', 'tracking']),

  // ═══════════════════════════════════════════════════════════════
  // TASK 4: Sampling
  // ═══════════════════════════════════════════════════════════════
  t(TP, 'tp-sampling', null, 'Sampling', SHUBHAM, 0, 3, '/tp-sampling', ['sampling']),

  // Subtask 4.1: Policy Definition
  t(TP, 'tp-sampling-policy', 'tp-sampling', 'Policy Definition', SHUBHAM, 1, 0,
    '/tp-sampling/tp-sampling-policy', ['sampling', 'policy']),
  t(TP, 'tp-sampling-policy-1', 'tp-sampling-policy', 'Define SKU-wise cap', SHUBHAM, 2, 0,
    '/tp-sampling/tp-sampling-policy/tp-sampling-policy-1', ['sampling']),

  // Subtask 4.2: Tracking
  t(TP, 'tp-sampling-tracking', 'tp-sampling', 'Tracking', SHUBHAM, 1, 1,
    '/tp-sampling/tp-sampling-tracking', ['sampling', 'tracking']),
  t(TP, 'tp-sampling-tracking-1', 'tp-sampling-tracking', 'Track sample issued', SHUBHAM, 2, 0,
    '/tp-sampling/tp-sampling-tracking/tp-sampling-tracking-1', ['sampling']),
  t(TP, 'tp-sampling-tracking-2', 'tp-sampling-tracking', 'Map sample → conversion', SHUBHAM, 2, 1,
    '/tp-sampling/tp-sampling-tracking/tp-sampling-tracking-2', ['sampling', 'conversion']),

  // Subtask 4.3: Control
  t(TP, 'tp-sampling-control', 'tp-sampling', 'Control', SHUBHAM, 1, 2,
    '/tp-sampling/tp-sampling-control', ['sampling', 'control']),
  t(TP, 'tp-sampling-control-1', 'tp-sampling-control', 'Block over-ordering', SHUBHAM, 2, 0,
    '/tp-sampling/tp-sampling-control/tp-sampling-control-1', ['sampling']),

  // ═══════════════════════════════════════════════════════════════
  // TASK 5: System & Tech
  // ═══════════════════════════════════════════════════════════════
  t(TP, 'tp-systemtech', null, 'System & Tech', YASH, 0, 4, '/tp-systemtech', ['tech']),

  // Subtask 5.1: Data Layer
  t(TP, 'tp-tech-data', 'tp-systemtech', 'Data Layer', RITIKH, 1, 0,
    '/tp-systemtech/tp-tech-data', ['tech', 'data']),
  t(TP, 'tp-tech-data-1', 'tp-tech-data', 'Build Retail Universe DB', RITIKH, 2, 0,
    '/tp-systemtech/tp-tech-data/tp-tech-data-1', ['tech', 'database']),
  t(TP, 'tp-tech-data-2', 'tp-tech-data', 'Distributor mapping', RITIKH, 2, 1,
    '/tp-systemtech/tp-tech-data/tp-tech-data-2', ['tech', 'mapping']),

  // Subtask 5.2: Dashboard
  t(TP, 'tp-tech-dashboard', 'tp-systemtech', 'Dashboard', YASH, 1, 1,
    '/tp-systemtech/tp-tech-dashboard', ['tech', 'dashboard']),
  t(TP, 'tp-tech-dashboard-1', 'tp-tech-dashboard', 'Hiring dashboard', YASH, 2, 0,
    '/tp-systemtech/tp-tech-dashboard/tp-tech-dashboard-1', ['tech', 'dashboard']),
  t(TP, 'tp-tech-dashboard-2', 'tp-tech-dashboard', 'Sales dashboard', SHUBHAM, 2, 1,
    '/tp-systemtech/tp-tech-dashboard/tp-tech-dashboard-2', ['tech', 'dashboard']),
  t(TP, 'tp-tech-dashboard-3', 'tp-tech-dashboard', 'Sampling dashboard', YASH, 2, 2,
    '/tp-systemtech/tp-tech-dashboard/tp-tech-dashboard-3', ['tech', 'dashboard']),

  // Subtask 5.3: Ops Execution
  t(TP, 'tp-tech-ops', 'tp-systemtech', 'Ops Execution', YASH, 1, 2,
    '/tp-systemtech/tp-tech-ops', ['tech', 'ops']),
  t(TP, 'tp-tech-ops-1', 'tp-tech-ops', 'CRM + Inventory + Ops sync + Task management system', YASH, 2, 0,
    '/tp-systemtech/tp-tech-ops/tp-tech-ops-1', ['tech', 'crm', 'ops']),

  // Subtask 5.4: Automation
  t(TP, 'tp-tech-auto', 'tp-systemtech', 'Automation', YASH, 1, 3,
    '/tp-systemtech/tp-tech-auto', ['tech', 'automation']),
  t(TP, 'tp-tech-auto-1', 'tp-tech-auto', 'Alerts (low sales / hiring delay)', YASH, 2, 0,
    '/tp-systemtech/tp-tech-auto/tp-tech-auto-1', ['tech', 'alerts']),

  // ═══════════════════════════════════════════════════════════════
  // TASK 6: Capability
  // ═══════════════════════════════════════════════════════════════
  t(TP, 'tp-capability', null, 'Capability', AMRIT, 0, 5, '/tp-capability', ['capability', 'training']),

  // Subtask 6.1: Training
  t(TP, 'tp-capability-training', 'tp-capability', 'Training', AMRIT, 1, 0,
    '/tp-capability/tp-capability-training', ['capability', 'training']),
  t(TP, 'tp-capability-training-1', 'tp-capability-training', 'New hire onboarding', AMRIT, 2, 0,
    '/tp-capability/tp-capability-training/tp-capability-training-1', ['training', 'onboarding']),
  t(TP, 'tp-capability-training-2', 'tp-capability-training', 'Product training', AMRIT, 2, 1,
    '/tp-capability/tp-capability-training/tp-capability-training-2', ['training', 'product']),

  // Subtask 6.2: Market Training
  t(TP, 'tp-capability-market', 'tp-capability', 'Market Training', AMRIT, 1, 1,
    '/tp-capability/tp-capability-market', ['capability', 'market-training']),
  t(TP, 'tp-capability-market-1', 'tp-capability-market', 'Distributor training', AMRIT, 2, 0,
    '/tp-capability/tp-capability-market/tp-capability-market-1', ['training', 'distributor']),
  t(TP, 'tp-capability-market-2', 'tp-capability-market', 'Retail awareness', AMRIT, 2, 1,
    '/tp-capability/tp-capability-market/tp-capability-market-2', ['training', 'retail']),
];

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  PROJECT: CUSTOMER LIFECYCLE MANAGEMENT (proj-clm)                      ║
// ║  4 Main Tasks → 23 Subtasks → 15 Microtasks = 42 records               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const clmTasks: Task[] = [

  // ═══════════════════════════════════════════════════════════════
  // TASK 1: Onboarding
  // ═══════════════════════════════════════════════════════════════
  t(CLM, 'clm-onboarding', null, 'Onboarding', JAYASHREE, 0, 0,
    '/clm-onboarding', ['onboarding']),

  // Subtask 1.1: Bulk Orders - School Identification
  t(CLM, 'clm-onb-bulk', 'clm-onboarding', 'Bulk Orders - School Identification', JAYASHREE, 1, 0,
    '/clm-onboarding/clm-onb-bulk', ['onboarding', 'schools']),
  t(CLM, 'clm-onb-bulk-1', 'clm-onb-bulk', 'Calling the Sales team & Distributor for School information', JAYASHREE, 2, 0,
    '/clm-onboarding/clm-onb-bulk/clm-onb-bulk-1', ['onboarding', 'calling']),

  // Subtask 1.2: Onboarding Mails bulk
  t(CLM, 'clm-onb-mails', 'clm-onboarding', 'Onboarding Mails bulk', NAMAN, 1, 1,
    '/clm-onboarding/clm-onb-mails', ['onboarding', 'email']),
  t(CLM, 'clm-onb-mails-1', 'clm-onb-mails', 'Bulk Onboarding Welcome Email Campaign with 3 Follow ups', NAMAN, 2, 0,
    '/clm-onboarding/clm-onb-mails/clm-onb-mails-1', ['onboarding', 'email', 'campaign']),

  // Subtask 1.3: Onboarding Calling
  t(CLM, 'clm-onb-calling', 'clm-onboarding', 'Onboarding Calling', JAYASHREE, 1, 2,
    '/clm-onboarding/clm-onb-calling', ['onboarding', 'calling']),
  t(CLM, 'clm-onb-calling-1', 'clm-onb-calling', 'School Onboarding Calling for Teachers details and QBG access', JAYASHREE, 2, 0,
    '/clm-onboarding/clm-onb-calling/clm-onb-calling-1', ['onboarding', 'calling', 'qbg']),

  // Subtask 1.4: Giving QBG Access
  t(CLM, 'clm-onb-qbg', 'clm-onboarding', 'Giving QBG Access', JAYASHREE, 1, 3,
    '/clm-onboarding/clm-onb-qbg', ['onboarding', 'qbg']),
  t(CLM, 'clm-onb-qbg-1', 'clm-onb-qbg', 'QBG Access data maintenance and tracking', JAYASHREE, 2, 0,
    '/clm-onboarding/clm-onb-qbg/clm-onb-qbg-1', ['onboarding', 'qbg', 'tracking']),

  // Subtask 1.5: Follow-up and RAC Intro Mails
  t(CLM, 'clm-onb-followup', 'clm-onboarding', 'Follow-up and RAC Intro Mails', JAYASHREE, 1, 4,
    '/clm-onboarding/clm-onb-followup', ['onboarding', 'follow-up']),
  t(CLM, 'clm-onb-followup-1', 'clm-onb-followup', 'Final Call scheduling with the Schools for Regional Academic Lead Intro', JAYASHREE, 2, 0,
    '/clm-onboarding/clm-onb-followup/clm-onb-followup-1', ['onboarding', 'scheduling']),

  // Subtask 1.6: Finalizing Gifting (leaf — no microtask)
  t(CLM, 'clm-onb-gifting', 'clm-onboarding', 'Finalizing Gifting', AYUSH_G, 1, 5,
    '/clm-onboarding/clm-onb-gifting', ['onboarding', 'gifting'], '', '2026-06-30'),

  // Subtask 1.7: Harddrive for Offline distribution of Digital content (leaf)
  t(CLM, 'clm-onb-harddrive', 'clm-onboarding', 'Harddrive for Offline distribution of Digital content', AYUSH_G, 1, 6,
    '/clm-onboarding/clm-onb-harddrive', ['onboarding', 'digital-content']),

  // Subtask 1.8: Adding PM-view in the Dashboard (leaf)
  t(CLM, 'clm-onb-pmview', 'clm-onboarding', 'Adding PM-view in the Dashboard', AYUSH_G, 1, 7,
    '/clm-onboarding/clm-onb-pmview', ['onboarding', 'dashboard']),

  // ═══════════════════════════════════════════════════════════════
  // TASK 2: Product & Tech
  // ═══════════════════════════════════════════════════════════════
  t(CLM, 'clm-prodtech', null, 'Product & Tech', NAMAN, 0, 1,
    '/clm-prodtech', ['product', 'tech']),

  // Subtask 2.1: Telecalling Email Dashboard
  t(CLM, 'clm-pt-telecall', 'clm-prodtech', 'Telecalling Email Dashboard', NAMAN, 1, 0,
    '/clm-prodtech/clm-pt-telecall', ['tech', 'dashboard']),
  t(CLM, 'clm-pt-telecall-1', 'clm-pt-telecall', 'Creating a complete Management dashboard with visibility on Calling Email metrics', NAMAN, 2, 0,
    '/clm-prodtech/clm-pt-telecall/clm-pt-telecall-1', ['tech', 'dashboard', 'metrics']),

  // Subtask 2.2: PM Route planning (leaf)
  t(CLM, 'clm-pt-pmroute', 'clm-prodtech', 'PM Route planning', NAMAN, 1, 1,
    '/clm-prodtech/clm-pt-pmroute', ['tech', 'routing']),

  // ═══════════════════════════════════════════════════════════════
  // TASK 3: Curriculum & PM
  // ═══════════════════════════════════════════════════════════════
  t(CLM, 'clm-curriculum', null, 'Curriculum & PM', AYUSH_G, 0, 2,
    '/clm-curriculum', ['curriculum', 'pm']),

  // Subtask 3.1: Finalizing Training Topics (leaf)
  t(CLM, 'clm-cur-training', 'clm-curriculum', 'Finalizing Training Topics', AYUSH_G, 1, 0,
    '/clm-curriculum/clm-cur-training', ['curriculum', 'training'], '', '2026-04-01'),

  // Subtask 3.2: Finalizing PM Intro Decks (leaf)
  t(CLM, 'clm-cur-pmdecks', 'clm-curriculum', 'Finalizing PM Intro Decks', AYUSH_G, 1, 1,
    '/clm-curriculum/clm-cur-pmdecks', ['curriculum', 'decks'], '', '2026-04-07'),

  // Subtask 3.3: Finalizing Product Adoption Decks (leaf)
  t(CLM, 'clm-cur-proddecks', 'clm-curriculum', 'Finalizing Product Adoption Decks', AYUSH_G, 1, 2,
    '/clm-curriculum/clm-cur-proddecks', ['curriculum', 'product-adoption'], '', '2026-04-07'),

  // Subtask 3.4: Feedback forms for Product Adoption trainings (leaf)
  t(CLM, 'clm-cur-feedback', 'clm-curriculum', 'Feedback forms for Product Adoption trainings', AYUSH_G, 1, 3,
    '/clm-curriculum/clm-cur-feedback', ['curriculum', 'feedback'], '', '2026-04-07'),

  // Subtask 3.5: Dashboard - School Details (leaf)
  t(CLM, 'clm-cur-dashboard', 'clm-curriculum', 'Dashboard - School Details', AYUSH_G, 1, 4,
    '/clm-curriculum/clm-cur-dashboard', ['curriculum', 'dashboard'], '', '2026-04-07'),

  // Subtask 3.6: Finalizing PM-Area cycle (leaf)
  t(CLM, 'clm-cur-pmcycle', 'clm-curriculum', 'Finalizing PM-Area cycle', AYUSH_G, 1, 5,
    '/clm-curriculum/clm-cur-pmcycle', ['curriculum', 'pm-cycle'], '', '2026-04-07'),

  // Subtask 3.7: PM Route planning (leaf)
  t(CLM, 'clm-cur-pmroute', 'clm-curriculum', 'PM Route planning', AYUSH_G, 1, 6,
    '/clm-curriculum/clm-cur-pmroute', ['curriculum', 'routing'], '', '2026-04-01'),

  // Subtask 3.8: Monitoring PM trainings (leaf)
  t(CLM, 'clm-cur-monitor', 'clm-curriculum', 'Monitoring PM trainings', AYUSH_G, 1, 7,
    '/clm-curriculum/clm-cur-monitor', ['curriculum', 'monitoring'], '', '2026-04-07'),

  // ═══════════════════════════════════════════════════════════════
  // TASK 4: School & Categorisation
  // ═══════════════════════════════════════════════════════════════
  t(CLM, 'clm-school', null, 'School & Categorisation', AYUSH_G, 0, 3,
    '/clm-school', ['school', 'categorisation']),

  // Subtask 4.1: List of schools - Bucketing
  t(CLM, 'clm-sch-bucket', 'clm-school', 'List of schools - Bucketing', AYUSH_G, 1, 0,
    '/clm-school/clm-sch-bucket', ['school', 'bucketing']),
  t(CLM, 'clm-sch-bucket-1', 'clm-sch-bucket', 'Priority Assigned', AYUSH_G, 2, 0,
    '/clm-school/clm-sch-bucket/clm-sch-bucket-1', ['school', 'priority']),
  t(CLM, 'clm-sch-bucket-2', 'clm-sch-bucket', 'Categorization of schools', AYUSH_G, 2, 1,
    '/clm-school/clm-sch-bucket/clm-sch-bucket-2', ['school', 'categorization']),

  // Subtask 4.2: School's lifecycle checklist
  t(CLM, 'clm-sch-lifecycle', 'clm-school', "School's lifecycle checklist", AYUSH_G, 1, 1,
    '/clm-school/clm-sch-lifecycle', ['school', 'lifecycle']),
  t(CLM, 'clm-sch-lifecycle-1', 'clm-sch-lifecycle', 'Digital content', AYUSH_G, 2, 0,
    '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-1', ['lifecycle']),
  t(CLM, 'clm-sch-lifecycle-2', 'clm-sch-lifecycle', 'TC&LP', AYUSH_G, 2, 1,
    '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-2', ['lifecycle']),
  t(CLM, 'clm-sch-lifecycle-3', 'clm-sch-lifecycle', 'QBG Access', AYUSH_G, 2, 2,
    '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-3', ['lifecycle', 'qbg']),
  t(CLM, 'clm-sch-lifecycle-4', 'clm-sch-lifecycle', 'No. of Trainings', AYUSH_G, 2, 3,
    '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-4', ['lifecycle', 'training']),
  t(CLM, 'clm-sch-lifecycle-5', 'clm-sch-lifecycle', 'Retention Potential', AYUSH_G, 2, 4,
    '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-5', ['lifecycle', 'retention']),
  t(CLM, 'clm-sch-lifecycle-6', 'clm-sch-lifecycle', 'Strength', AYUSH_G, 2, 5,
    '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-6', ['lifecycle']),
  t(CLM, 'clm-sch-lifecycle-7', 'clm-sch-lifecycle', 'Rev Potential', AYUSH_G, 2, 6,
    '/clm-school/clm-sch-lifecycle/clm-sch-lifecycle-7', ['lifecycle', 'revenue']),

  // Subtask 4.3: Training Decks (leaf)
  t(CLM, 'clm-sch-traindecks', 'clm-school', 'Training Decks', AYUSH_G, 1, 2,
    '/clm-school/clm-sch-traindecks', ['school', 'training']),

  // Subtask 4.4: Product Adoption Decks (leaf)
  t(CLM, 'clm-sch-proddecks', 'clm-school', 'Product Adoption Decks', AYUSH_G, 1, 3,
    '/clm-school/clm-sch-proddecks', ['school', 'product-adoption']),

  // Subtask 4.5: Feedback forms (leaf)
  t(CLM, 'clm-sch-feedback', 'clm-school', 'Feedback forms', AYUSH_G, 1, 4,
    '/clm-school/clm-sch-feedback', ['school', 'feedback']),
];

// ═══════════════════════════════════════════════════════════════════════════
// Combined export: all seed tasks across both projects
// ═══════════════════════════════════════════════════════════════════════════
export const seedTasks: Task[] = [...testPrepTasks, ...clmTasks];
