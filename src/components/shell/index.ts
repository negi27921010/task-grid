// Phase 3 — application shell. Drop-in replacement candidates for the
// legacy components in src/components/layout/. Existing pages keep using
// the legacy shell until they migrate in Phase 4.

export { RefinedAppShell, useCommandPalette } from './refined-app-shell';
export { RefinedSidebar } from './refined-sidebar';
export { RefinedPageHeader } from './refined-page-header';
export type { PageTab } from './refined-page-header';
export { RefinedToolbar, PrimaryNewTaskButton } from './refined-toolbar';
export { CommandPalette } from './command-palette';
export { BulkBar } from './bulk-bar';
export type { BulkAction } from './bulk-bar';
