'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DoctorAvailabilityCalendar from '@/components/availability/DoctorAvailabilityCalendar';

export default function AvailabilityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'DOCTOR') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <DoctorAvailabilityCalendar />
    </div>
  );
}