'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DoctorSearch from '@/components/doctors/DoctorSearch';

export default function DoctorsPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Doctors</h1>
        <p className="text-gray-600 mt-1">
          Search and book appointments with verified doctors
        </p>
      </div>

      <DoctorSearch />
    </div>
  );
}