'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  User,
  Settings,
  LogOut,
  CreditCard,
  ClipboardList,
  Users as PatientsIcon,
  Clock,
} from 'lucide-react';

interface SidebarProps {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname?.includes(path);

  // ✅ Doctor navigation
  const doctorNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/appointments' },
    { icon: PatientsIcon, label: 'My Patients', href: '/dashboard/patients' },
    { icon: Clock, label: 'Manage Queue', href: '/dashboard/queue' },
    { icon: CreditCard, label: 'Payments', href: '/dashboard/payments' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  

  // ✅ Patient navigation
  const patientNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/appointments' },
    { icon: Stethoscope, label: 'Find Doctors', href: '/dashboard/doctors' },
    { icon: CreditCard, label: 'Payments', href: '/dashboard/payments' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  const navItems = user.role === 'DOCTOR' ? doctorNavItems : patientNavItems;

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">HealthCare</h1>
        <p className="text-xs text-gray-500 mt-1">
          {user.role === 'DOCTOR' ? 'Doctor Portal' : 'Patient Portal'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                active
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {user.name?.charAt(0) || user.email?.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}