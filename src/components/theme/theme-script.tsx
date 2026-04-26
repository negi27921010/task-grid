// Runs in <head> before paint to set data-theme from localStorage so
// dark-mode users don't see a flash of light first. The script is
// inlined (dangerouslySetInnerHTML) so it executes synchronously.

const SCRIPT = `
try {
  // Dark is the explicit default for new visitors. We honour the user's
  // stored preference if they've ever toggled, so anyone who actively
  // chose light keeps light. OS-level prefers-color-scheme is ignored
  // either way — the in-app toggle is the single source of truth.
  var stored = localStorage.getItem('taskflow-theme');
  var theme = stored === 'dark' || stored === 'light' ? stored : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
} catch (e) {}
`.trim();

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
