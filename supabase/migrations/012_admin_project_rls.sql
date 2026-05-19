-- ============================================================
-- Migration 008: Explicit admin RLS policies for projects
--
-- The original migration.sql created a blanket "Authenticated
-- users full access" policy that relies purely on app-layer RBAC.
-- This migration replaces it with split, role-aware policies so
-- the database itself enforces that only admins can INSERT or
-- DELETE projects, while all authenticated users can still SELECT
-- and UPDATE (edit is further constrained by the app layer).
-- ============================================================

-- Drop the old catch-all policy (created by migration.sql)
DROP POLICY IF EXISTS "Authenticated users full access" ON projects;

-- SELECT: every authenticated user can read all projects
CREATE POLICY "projects_authenticated_select" ON projects
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: only admins may create projects
CREATE POLICY "projects_admin_insert" ON projects
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin'
  );

-- UPDATE: admins can edit any project; members can only edit
-- projects they own (app layer adds further capability checks)
CREATE POLICY "projects_update" ON projects
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin'
    OR owner_id = auth.uid()::text
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin'
    OR owner_id = auth.uid()::text
  );

-- DELETE: only admins may delete projects
CREATE POLICY "projects_admin_delete" ON projects
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin'
  );
