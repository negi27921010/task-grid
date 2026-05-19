'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import { AlertCircle, ArrowRight, Eye, EyeOff, Zap, Shield, BarChart3 } from 'lucide-react';

const FEATURES = [
  { icon: Zap, text: 'Hierarchical task management with infinite nesting', delay: 0 },
  { icon: Shield, text: 'Role-based access control for enterprise teams', delay: 80 },
  { icon: BarChart3, text: 'Real-time aging tracking and priority management', delay: 160 },
];

/* ── Animated Grid Background ────────────────────────────────── */
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Animated gradient sweep */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.08), transparent)',
        }}
      />
    </div>
  );
}

/* ── Floating Orbs ───────────────────────────────────────────── */
function FloatingOrbs() {
  return (
    <>
      <div
        className="orb orb-blue animate-float"
        style={{ width: 400, height: 400, top: '-10%', left: '-5%', animationDelay: '0s' }}
      />
      <div
        className="orb orb-violet animate-float"
        style={{ width: 350, height: 350, bottom: '-5%', right: '-8%', animationDelay: '-2s' }}
      />
      <div
        className="orb orb-cyan animate-float"
        style={{ width: 200, height: 200, top: '40%', right: '15%', animationDelay: '-4s' }}
      />
    </>
  );
}

/* ── Typing Effect ───────────────────────────────────────────── */
function TypeWriter({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        // Keep cursor blinking for a moment then hide
        setTimeout(() => setShowCursor(false), 2000);
      }
    }, 45);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span className={className}>
      {displayed}
      {showCursor && (
        <span className="inline-block w-[2px] h-[1em] bg-[var(--accent)] ml-0.5 align-middle" style={{ animation: 'blink 1s step-end infinite' }} />
      )}
    </span>
  );
}

/* ── Particle Field ──────────────────────────────────────────── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    // Create particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.offsetWidth) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.offsetHeight) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/* ════════════════════════════════════════════════════════════════
   LOGIN PAGE — Cinematic, immersive, AI-native
   ════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : authError.message
      );
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-canvas">
      {/* ─── Left Panel — Cinematic Brand Hero ─── */}
      <div className="relative hidden w-[55%] overflow-hidden lg:flex lg:flex-col lg:justify-between"
        style={{ background: 'linear-gradient(145deg, #030712 0%, #0c1222 40%, #111827 100%)' }}
      >
        <FloatingOrbs />
        <AnimatedGrid />
        <ParticleField />

        {/* Content — staggered entrance */}
        <div className={`relative z-10 flex flex-1 flex-col justify-center px-14 xl:px-20 ${mounted ? 'stagger-children' : ''}`}>
          {/* Brand mark */}
          <div className="mb-14 flex items-center gap-3.5">
            <div className="relative">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                style={{ background: 'var(--accent-gradient)', boxShadow: '0 0 30px rgba(59,130,246,0.3)' }}
              >
                <Zap className="h-5 w-5" strokeWidth={2.2} />
              </span>
              {/* Glow ring */}
              <span className="absolute -inset-1 rounded-xl animate-pulse-glow" style={{ background: 'var(--accent-gradient)', opacity: 0.15, filter: 'blur(8px)' }} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold tracking-tight text-white">Task Grid</h1>
              <p className="text-[11px] font-medium text-blue-400/70 tracking-wide uppercase">PW Academy</p>
            </div>
          </div>

          {/* Hero headline — typing effect */}
          <h2 className="mb-5 text-[40px] font-bold leading-[1.1] tracking-tight text-white xl:text-[48px]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <TypeWriter text="Enterprise Task &" />
            <br />
            <span className="text-gradient">Project Management</span>
          </h2>

          <p className="mb-12 max-w-lg text-[15px] leading-relaxed text-slate-400/90 animate-fade-in-up"
            style={{ animationDelay: '600ms' }}
          >
            Manage projects, track progress, and coordinate your team with hierarchical task trees,
            real-time status tracking, and role-based access control.
          </p>

          {/* Feature pills */}
          <div className="space-y-3.5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 animate-fade-in-up"
                style={{ animationDelay: `${700 + f.delay}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
                  <f.icon className="h-4.5 w-4.5 text-blue-400" />
                </div>
                <span className="text-[13.5px] font-medium text-slate-300/90">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-14 pb-8 xl:px-20 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
          <div className="flex items-center gap-6">
            <p className="text-[11px] text-slate-600">
              &copy; {new Date().getFullYear()} PW Academy. All rights reserved.
            </p>
            <div className="h-3 w-px bg-slate-700/50" />
            <p className="text-[11px] text-slate-600">Secured with enterprise-grade encryption</p>
          </div>
        </div>
      </div>

      {/* ─── Right Panel — Login Form ─── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-12 lg:px-16 relative">
        {/* Subtle ambient glow on the form side */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[200px] -left-[100px] w-[400px] h-[400px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
          />
        </div>

        <div className={`w-full max-w-[380px] relative ${mounted ? 'stagger-children' : ''}`}>
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ background: 'var(--accent-gradient)' }}
            >
              <Zap className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-text">Task Grid</h1>
              <p className="text-xs text-text-muted">by PW Academy</p>
            </div>
          </div>

          <div className="mb-8">
            <h2
              className="text-[26px] font-bold tracking-tight text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Welcome back
            </h2>
            <p className="mt-2 text-[14px] text-text-muted">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-text">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="h-11 w-full rounded-[var(--radius-md)] border border-border-color bg-canvas/50 px-3.5 text-sm text-text shadow-[var(--shadow-xs)] placeholder:text-text-faint hover:border-text-faint focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-glow)]"
                placeholder="you@pw.live"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-text">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 w-full rounded-[var(--radius-md)] border border-border-color bg-canvas/50 px-3.5 pr-10 text-sm text-text shadow-[var(--shadow-xs)] placeholder:text-text-faint hover:border-text-faint focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-glow)]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 animate-scale-in">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold text-white overflow-hidden disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'var(--accent-gradient)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1), 0 0 20px var(--accent-glow)',
              }}
            >
              {/* Hover shimmer */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer" />
              <span className="relative flex items-center gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-[12px] text-text-faint">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  );
}
