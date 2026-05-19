export default function GlobalLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4 animate-fade-in-up">
        {/* Pulsing ring loader */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-border-color" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent)] animate-spin-smooth" />
          <div className="absolute inset-1.5 rounded-full animate-pulse-glow" style={{ background: 'var(--accent-glow)' }} />
        </div>
        <p className="text-sm font-medium text-text-muted tracking-wide">Loading...</p>
      </div>
    </div>
  );
}
