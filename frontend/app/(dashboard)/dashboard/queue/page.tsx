'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import QueueManager from '../../../../components/Queue/QueueManager';

const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
);

export default function DoctorQueuePage() {
  const { data: session, status } = useSession();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id && session?.user?.role === 'DOCTOR') {
      fetch(`http://localhost:4000/api/doctors/user/${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session?.accessToken}` },
      })
        .then(res => res.json())
        .then(data => {
          setDoctorId(data.id);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching doctor:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (session?.user?.role !== 'DOCTOR') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Doctor only.</p>
      </div>
    );
  }

  if (!doctorId) {
    return (
      <div className="text-center py-12">
        <p className="text-yellow-600">Please complete your doctor profile first.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Queue Management</h1>
      <QueueManager doctorId={doctorId} role="DOCTOR" />
    </div>
  );
}