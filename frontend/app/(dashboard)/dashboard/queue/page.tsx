'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Clock, 
  Users, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ChevronRight,
  Phone,
  Video,
  MapPin
} from 'lucide-react';

interface QueueAppointment {
  id: string;
  scheduledAt: string;
  queueNumber: number;
  status: string;
  type: 'ONLINE' | 'OFFLINE';
  patient: {
    id: string;
    name: string;
    user: {
      email: string;
    };
  };
  availability: {
    startTime: string;
    endTime: string;
  };
}

export default function QueuePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<QueueAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (session?.user?.role === 'DOCTOR') {
      fetchQueue();
    } else {
      router.push('/dashboard');
    }
  }, [session, selectedDate]);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/bookings/doctor-queue/${session?.user?.id}?date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        toast.error('Failed to load queue');
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    setActionLoading(appointmentId);
    try {
      const endpoint = status === 'CHECKED_IN' ? 'checkin' : 'complete';
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success(`Appointment ${status.toLowerCase()} successfully`);
        fetchQueue();
      } else {
        toast.error(`Failed to ${status.toLowerCase()} appointment`);
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update appointment');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const todayAppointments = appointments.filter(
    a => new Date(a.scheduledAt).toDateString() === new Date(selectedDate).toDateString()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Queue</h1>
          <p className="text-gray-600 mt-1">
            Manage your patient queue and appointments
          </p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Waiting</p>
              <p className="text-2xl font-bold text-gray-900">
                {todayAppointments.filter(a => a.status === 'SCHEDULED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {todayAppointments.filter(a => a.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Today's Queue</h2>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No patients in queue for today</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayAppointments.map((appt, index) => (
              <div key={appt.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-green-100 text-green-600' :
                      index < 3 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      #{appt.queueNumber || index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{appt.patient.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">
                          {new Date(appt.scheduledAt).toLocaleString()}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full flex items-center gap-1">
                          {appt.type === 'ONLINE' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {appt.type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          appt.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-700' :
                          appt.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                          appt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(appt.id, 'CHECKED_IN')}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading === appt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Check In'
                          )}
                        </button>
                      </>
                    )}
                    {appt.status === 'CHECKED_IN' && (
                      <button
                        onClick={() => updateAppointmentStatus(appt.id, 'COMPLETED')}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === appt.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Complete'
                        )}
                      </button>
                    )}
                    {appt.status === 'COMPLETED' && (
                      <span className="text-sm text-green-600 font-medium">✓ Done</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}