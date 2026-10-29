'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

interface TopbarProps {
  userEmail: string;
}

export function Topbar({ userEmail }: TopbarProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    router.push('/login');
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/orders?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  function toggleSidebar() {
    const btn = document.getElementById('sidebar-toggle');
    btn?.click();
  }

  return (
    <header className="topbar">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={toggleSidebar}
          className="btn btn-ghost btn-icon lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden sm:block">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9B9B9B' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, customers..."
              className="input"
              style={{
                width: '280px',
                paddingLeft: '36px',
                height: '38px',
                fontSize: '13px',
                background: '#F7F4E8',
                border: '1px solid transparent',
              }}
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="btn btn-ghost btn-icon relative"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="btn btn-ghost flex items-center gap-2"
            style={{ padding: '6px 12px' }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full"
              style={{ background: '#2D5A3D', color: 'white', fontSize: '13px', fontWeight: 600 }}
            >
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </span>
            <ChevronDown size={14} style={{ color: '#9B9B9B' }} />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 z-50 card"
                style={{ width: '200px', padding: '8px' }}
              >
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    router.push('/dashboard/settings');
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-gray-50"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#4A4A4A' }}
                >
                  <User size={16} />
                  Profile & Settings
                </button>
                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #E5DFC8' }} />
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-gray-50"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#C62828' }}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
