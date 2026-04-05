'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import QueueManager from '../../../../../components/Queue/QueueManager';

const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
);

export default function QueuePage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const { data: session } = useSession();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appointmentId && session?.accessToken) {
      fetch(`http://localhost:4000/api/bookings/${appointmentId}`, {
        headers: { 'Authorization': `Bearer ${session?.accessToken}` },
      })
        .then(res => res.json())
        .then(data => {
          setDoctorId(data.doctorId);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching appointment:', error);
          setLoading(false);
        });
    }
  }, [appointmentId, session]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!doctorId) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Appointment not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <QueueManager doctorId={doctorId} role="PATIENT" appointmentId={appointmentId} />
    </div>
  );
}