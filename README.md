# Task Grid

**Outcome-driven project management with daily accountability.**

Task Grid is an enterprise-grade task and project management platform built for internal teams. It combines hierarchical task management, daily standup accountability, AI-powered insights, and real-time notifications into a single dashboard.

**Live Demo:** [https://taskflow-puce-nine.vercel.app](https://taskflow-puce-nine.vercel.app)

---

## Features

### Core Task Management
- **Hierarchical tasks** — Tasks, subtasks, and microtasks with infinite nesting
- **Inline editing** — Click any field to edit directly in the table
- **Multiple views** — Table, Kanban, and Hybrid layouts
- **Smart filters** — Filter by status, priority, owner, aging status with saveable presets
- **Pagination** — 25 tasks per page with navigation controls
- **Bulk CSV import** — Upload tasks via CSV with validation and sample template
- **ETA enforcement** — Moving a task to "In Progress" requires a due date

### Daily Standup Module
- **Morning commitment** — Team members commit to 1+ measurable outcomes each day
- **Evening closure** — Mark each outcome as Done or Not Done with mandatory reasons
- **Carry-forward chain** — Incomplete outcomes auto-carry to the next day with streak tracking
- **Outcome validation** — Rejects vague descriptions ("work on stuff"), enforces specificity
- **Admin team overview** — Expandable per-member detail view with completion rates
- **Stuck detection** — Outcomes carried 3+ consecutive days flagged as STUCK

### AI Chatbot (Task Grid AI)
- **Natural language queries** — "What tasks are overdue?", "Who hasn't submitted standup?"
- **Context-aware** — Queries your actual database (tasks, projects, standups, team)
- **Streaming responses** — Real-time token-by-token rendering
- **Role-scoped** — Members see their own data, admins see everything
- **Powered by** Groq (Llama 3.3 70B)

### Notifications & @Mentions
- **@mention in comments** — Type @ to see team dropdown, select to mention
- **Notification bell** — Red dot badge with unread count, polls every 30s
- **Deep linking** — Click a notification to navigate directly to the task
- **Types** — Mention, assignment, status change notifications

### Admin & Permissions
- **Role-based access** — Admin and Member roles with granular capability toggles
- **User management** — Create, edit, delete users with Supabase Auth sync
- **Password management** — Admin can reset passwords, visibility toggle
- **Dynamic permissions** — Toggle member capabilities via switches (persisted to DB)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | Radix UI primitives |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password) |
| **State Management** | TanStack React Query v5 |
| **AI** | Groq API (Llama 3.3 70B) |
| **Icons** | Lucide React |
| **Deployment** | Vercel |
| **Package Manager** | pnpm |

---

## Project Structure

```
taskflow/
├── src/
│   ├── app/                          # Next.js pages & API routes
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── login/page.tsx            # Authentication page
│   │   ├── dashboard/page.tsx        # Main dashboard (My Tasks / Admin view)
│   │   ├── project/[id]/page.tsx     # Project detail with task list
│   │   ├── standups/page.tsx         # Daily standup (morning/evening/admin)
│   │   ├── settings/page.tsx         # User management & permissions
│   │   └── api/
│   │       ├── chat/route.ts         # AI chatbot API (Groq streaming)
│   │       └── admin/
│   │           ├── users/route.ts    # User CRUD + Auth sync
│   │           ├── permissions/route.ts  # Member capability config
│   │           └── reset-password/route.ts
│   ├── components/
│   │   ├── layout/                   # App shell, sidebar, header, notifications
│   │   ├── task/                     # Table, row, kanban, detail panel, filters
│   │   ├── chat/                     # AI chatbot widget & messages
│   │   └── ui/                       # Button, Badge, Dialog, Avatar, Toast, etc.
│   └── lib/
│       ├── api/                      # Supabase query functions
│       │   ├── tasks.ts              # Task CRUD, status transitions
│       │   ├── projects.ts           # Project CRUD
│       │   ├── users.ts              # User CRUD
│       │   ├── standups.ts           # Standup CRUD, carry-forward logic
│       │   └── notifications.ts      # Notification CRUD
│       ├── hooks/                    # React Query hooks for all resources
│       ├── types/                    # TypeScript interfaces
│       └── utils/                    # Permissions, aging, search, mentions
├── supabase/
│   ├── migration.sql                 # Core schema (users, projects, tasks, comments, labels)
│   ├── 002_add_assignees.sql         # Multi-assignee support
│   ├── 003_daily_standups.sql        # Standup tables
│   └── 004_notifications.sql         # Notifications table
└── public/
    └── logo.png                      # App logo
```

---

## Setup Guide

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase project (free tier works)
- Groq API key (free at [console.groq.com](https://console.groq.com/keys)) — optional, for AI chatbot

### 1. Clone & Install

```bash
git clone https://github.com/negi27921010/task-grid.git
cd task-grid
pnpm install
```

### 2. Configure Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=gsk_your_groq_key
```

Get your Supabase keys from: **Supabase Dashboard > Settings > API**

### 3. Run Database Migrations

In the Supabase SQL Editor (`Dashboard > SQL Editor > New Query`), run these files **in order**:

1. `supabase/migration.sql` — Core tables (users, projects, tasks, comments, labels)
2. `supabase/003_daily_standups.sql` — Standup module tables
3. `supabase/004_notifications.sql` — Notifications table

### 4. Create First Admin User

In the Supabase SQL Editor:

```sql
INSERT INTO users (id, email, full_name, role, department)
VALUES ('admin-1', 'admin@yourcompany.com', 'Admin Name', 'admin', 'Management');
```

Then create the auth account via Supabase Dashboard > Authentication > Add User, using the same email with a password.

### 5. Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your admin credentials.

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GROQ_API_KEY production
```

---

## Database Schema

### Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Team members | id, email, full_name, role (admin/member), department |
| `projects` | Project containers | id, name, description, status, owner_id |
| `tasks` | Hierarchical tasks | id, title, status, priority (P1-P4), owner_id, eta, depth, path |
| `comments` | Task comments | id, task_id, author_id, content |
| `labels` | Color labels + system settings | id, name, color |
| `daily_standups` | One per user per day | id, user_id, standup_date, morning/evening timestamps |
| `standup_outcomes` | 1-N per standup | id, outcome_text, evening_status, carry_streak |
| `notifications` | User notifications | id, user_id, type, title, task_id, is_read |

### Task Status Flow

```
not_started ──> in_progress ──> completed
                    │
                    ├──> blocked ──> in_progress
                    │
                    └──> cancelled ──> not_started
```

- **not_started -> in_progress**: Requires ETA (due date) to be set
- **any -> blocked**: Requires blocker reason (min 10 chars)
- **parent -> completed**: All subtasks must be completed first

---

## Configuration

### Permissions

Admins can toggle member capabilities in **Settings > Permissions**:

| Capability | Default (Member) | Toggleable |
|-----------|------------------|-----------|
| Add Tasks | Yes | Yes |
| Update Task Status | Yes | Yes |
| Set Priority | Yes | Yes |
| Update ETA | Yes | Yes |
| Add Comments | Yes | Yes |
| View All Projects | Yes | Yes |
| Create Projects | No | Yes |
| Delete Tasks | No | Yes |
| Modify All Fields | No | Yes |
| Manage Users | No | Locked |
| Access Settings | No | Locked |

### Standup Timing (IST)
- Morning deadline: 10:30 AM (late flag after this)
- Morning edit window: Until 12:00 PM
- Evening submission: 5:00 PM - 11:59 PM
- Evening late flag: After 8:00 PM

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | AI chatbot (Groq streaming) |
| `/api/admin/users` | POST/PATCH/DELETE | User CRUD + Auth sync |
| `/api/admin/permissions` | GET/POST | Member capability config |
| `/api/admin/reset-password` | POST | Password reset |

---

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

---

## License

Private. All rights reserved.
