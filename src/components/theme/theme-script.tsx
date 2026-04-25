// Runs in <head> before paint to set data-theme from localStorage so
// dark-mode users don't see a flash of light first. The script is
// inlined (dangerouslySetInnerHTML) so it executes synchronously.

const SCRIPT = `
try {
  var stored = localStorage.getItem('taskflow-theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = stored === 'dark' || stored === 'light'
    ? stored
    : (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
} catch (e) {}
`.trim();

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
