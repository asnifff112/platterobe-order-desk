import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login — PLATTEROBE ORDER DESK',
  description: 'Admin login for PLATTEROBE ORDER DESK',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3D2A 0%, #2D5A3D 50%, #3A7350 100%)' }}>
      <div className="w-full max-w-md mx-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.2" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Outfit, sans-serif">P</text>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            PLATTEROBE
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Order Desk — Admin Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: '32px' }}>
          <LoginForm />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Authorized administrators only
        </p>
      </div>
    </div>
  );
}
