'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Users, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import AppointmentList from '@/components/appointments/AppointmentList';

interface QueueStatus {
  appointmentId: string;
  queueNumber: number;
  currentPosition: number;
  totalInQueue: number;
  scheduledAt: string;
  status: string;
  doctorName: string;
  patientName: string;
}

export default function AppointmentsPage() {
  const { data: session } = useSession();
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  const fetchQueueStatus = async (appointmentId: string) => {
    if (!session?.accessToken) {
      toast.error('Please login again');
      return;
    }
    
    setLoadingQueue(true);
    try {
      const response = await fetch(`${API_BASE}/bookings/queue/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data);
        setSelectedAppointment(appointmentId);
      } else if (response.status === 404) {
        toast.error('Appointment not found');
      } else {
        toast.error('Failed to fetch queue status');
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
      toast.error('Failed to fetch queue status');
    } finally {
      setLoadingQueue(false);
    }
  };

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

      {/* ✅ Queue Status Display */}
      {selectedAppointment && queueStatus && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
              {queueStatus.currentPosition}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Your Queue Position</h3>
              <p className="text-gray-600 text-sm">
                You are #{queueStatus.queueNumber} in line (Total: {queueStatus.totalInQueue} patients)
              </p>
              <p className="text-xs text-gray-500">
                {new Date(queueStatus.scheduledAt).toLocaleString()}
              </p>
            </div>
            {queueStatus.currentPosition === 1 && (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                Next!
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedAppointment(null);
              setQueueStatus(null);
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Close
          </button>
        </div>
      )}

      {/* ✅ Appointment List with queue status */}
      <AppointmentList role={session.user.role as any} />
    </div>
  );
}