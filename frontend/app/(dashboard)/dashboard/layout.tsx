import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Toaster } from 'sonner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Ensure user object has all required fields with fallbacks
  const user = {
    id: session.user.id,
    email: session.user.email || '',
    role: session.user.role,
    name: session.user.name || '',
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        {/* Header with Notification Bell */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {user.name || user.email?.split('@')[0]}
              </p>
            </div>
            <NotificationBell />
          </div>
        </div>
        
        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}