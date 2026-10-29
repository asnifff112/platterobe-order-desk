'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { label: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button - rendered via Topbar */}
      <button
        id="sidebar-toggle"
        className="hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      />

      <aside
        className={`sidebar ${mobileOpen ? 'open' : ''}`}
        style={{ transform: mobileOpen ? 'translateX(0)' : undefined }}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px' }}>P</span>
                </div>
                <div>
                  <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>
                    PLATTEROBE
                  </h1>
                  <span style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Order Desk
                  </span>
                </div>
              </div>
            </Link>
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(false)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">Menu</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', opacity: 0.4 }}>
          Parappanangadi, Kerala
        </div>
      </aside>
    </>
  );
}
