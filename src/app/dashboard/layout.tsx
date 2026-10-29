import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F4E8' }}>
      <Sidebar />
      <div className="main-content">
        <Topbar userEmail={user.email || ''} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
