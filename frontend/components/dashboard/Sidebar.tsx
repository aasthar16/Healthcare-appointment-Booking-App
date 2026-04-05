'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  Stethoscope,
  LogOut,
  Home,
  ListOrdered,
  Bell,
  CreditCard,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  user: {
    id: string;
    email?: string | null;
    role: string;
    name?: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const patientLinks = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'My Appointments',
      href: '/dashboard/appointments',
      icon: Calendar,
    },
    {
      name: 'Find Doctors',
      href: '/dashboard/doctors',
      icon: Stethoscope,
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
    },
    {
      name: 'Payments',
      href: '/dashboard/payments',
      icon: CreditCard,
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserCircle,
    },
  ];

  const doctorLinks = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'My Appointments',
      href: '/dashboard/appointments',
      icon: Calendar,
    },
    {
      name: 'Availability',
      href: '/dashboard/availability',
      icon: Clock,
    },
    {
      name: 'Queue Management',
      href: '/dashboard/queue',
      icon: ListOrdered,
    },
    {
      name: 'My Patients',
      href: '/dashboard/patients',
      icon: Users,
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
    },
    {
      name: 'Payments',
      href: '/dashboard/payments',
      icon: CreditCard,
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserCircle,
    },
    {
      name: 'Complete Profile',
      href: '/dashboard/onboarding',
      icon: UserCircle,
    },
  ];

  const links = user?.role === 'DOCTOR' ? doctorLinks : patientLinks;
  const userEmail = user?.email || 'User';
  const userName = user?.name || userEmail.split('@')[0] || 'User';

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">HealthCare</h1>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900 truncate">
            {userName}
          </p>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {userEmail}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {user?.role === 'DOCTOR' ? 'Doctor' : 'Patient'}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
