'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        toast.error('Login failed', { description: authError.message });
        return;
      }

      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-1" style={{ color: '#2C2C2C' }}>
        Welcome back
      </h2>
      <p className="text-sm mb-6" style={{ color: '#9B9B9B' }}>
        Sign in to manage your orders
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FFEBEE', color: '#C62828' }}>
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="login-email" className="label">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="admin@platterobe.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="login-password" className="label">Password</label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            style={{ paddingRight: '44px' }}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#9B9B9B', background: 'none', border: 'none', cursor: 'pointer' }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
        style={{ height: '44px' }}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <LogIn size={18} />
            Sign In
          </>
        )}
      </button>

      <div className="text-center mt-4">
        <a
          href="/reset-password"
          className="text-sm"
          style={{ color: '#2D5A3D', textDecoration: 'none' }}
        >
          Forgot your password?
        </a>
      </div>
    </form>
  );
}
