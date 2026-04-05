'use client';

import { useSession } from 'next-auth/react';
import AppointmentList from '@/components/appointments/AppointmentList';

export default function AppointmentsPage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-600 mt-1">
          View and manage your appointments
        </p>
      </div>

      <AppointmentList role={session.user.role as any} />
    </div>
  );
}