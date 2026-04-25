// Runs in <head> before paint to set data-theme from localStorage so
// dark-mode users don't see a flash of light first. The script is
// inlined (dangerouslySetInnerHTML) so it executes synchronously.

const SCRIPT = `
try {
  // Light is the explicit default. We only honour stored preference;
  // OS-level prefers-color-scheme is intentionally ignored so a user on
  // a dark-mode device still sees the app in light unless they opt in.
  var stored = localStorage.getItem('taskflow-theme');
  var theme = stored === 'dark' || stored === 'light' ? stored : 'light';
  document.documentElement.setAttribute('data-theme', theme);
} catch (e) {}
`.trim();

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
