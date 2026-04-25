'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import { AlertCircle, LayoutGrid, Users2, BarChart3, ArrowRight, Eye, EyeOff } from 'lucide-react';

const FEATURES = [
  { icon: LayoutGrid, text: 'Hierarchical task management with infinite nesting' },
  { icon: Users2, text: 'Role-based access control for teams' },
  { icon: BarChart3, text: 'Real-time aging tracking and priority management' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex min-h-screen">
      {/* Left Panel — Brand */}
      <div className="relative hidden w-[52%] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 lg:flex lg:flex-col lg:justify-between">
        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          <div className="mb-12 flex items-center gap-3">
            <Image src="/logo.png" alt="PW Academy" width={44} height={44} className="rounded-xl" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Task Grid</h1>
              <p className="text-xs font-medium text-blue-300/80">by PW Academy</p>
            </div>
          </div>

          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            Enterprise Task &<br />Project Management
          </h2>
          <p className="mb-10 max-w-md text-base leading-relaxed text-slate-400">
            Manage projects, track progress, and coordinate your team with hierarchical task trees, real-time status tracking, and role-based access control.
          </p>

          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <f.icon className="h-4.5 w-4.5 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-12 pb-8 xl:px-16">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} PW Academy. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-12 lg:px-16">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="PW Academy" width={40} height={40} className="rounded-xl" />
            <div>
              <h1 className="text-lg font-bold text-text">Task Grid</h1>
              <p className="text-xs text-text-muted">by PW Academy</p>
            </div>
          </div>

          <div className="mb-8">
            <h2
              className="text-2xl font-bold tracking-tight text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-text-muted">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">
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
                className="h-11 w-full rounded-lg border border-border-color bg-surface px-3.5 text-sm text-text shadow-sm transition-all placeholder:text-text-faint hover:border-text-faint focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10"
                placeholder="you@pw.live"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
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
                  className="h-11 w-full rounded-lg border border-border-color bg-surface px-3.5 pr-10 text-sm text-text shadow-sm transition-all placeholder:text-text-faint hover:border-text-faint focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint transition-colors hover:text-text-muted"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                ['--tw-ring-color' as string]: 'rgb(0 115 234 / 0.2)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-text-faint">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  );
}
