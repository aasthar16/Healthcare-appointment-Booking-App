'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Users, 
  User, 
  Calendar, 
  Clock, 
  Phone, 
  Mail,
  Video,
  MapPin,
  Search,
  ChevronRight,
  Star,
  ArrowUpRight
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  userId: string;
  user?: {
    email: string;
  };
  appointmentCount: number;
  lastAppointment?: {
    scheduledAt: string;
    type: 'ONLINE' | 'OFFLINE';
    status: string;
  };
}

export default function PatientsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (session?.user?.role === 'DOCTOR') {
      fetchPatients();
    }
  }, [session]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/patients/my-patients`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      } else {
        toast.error('Failed to load patients');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Stats
  const totalPatients = patients.length;
  const onlinePatients = patients.filter(p => 
    p.lastAppointment?.type === 'ONLINE'
  ).length;
  const offlinePatients = patients.filter(p => 
    p.lastAppointment?.type === 'OFFLINE'
  ).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
        <p className="text-gray-600 mt-1">
          View all patients who have booked appointments with you
        </p>
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
              <p className="text-2xl font-bold text-gray-900">{totalPatients}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full">
              <Video className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Online</p>
              <p className="text-2xl font-bold text-gray-900">{onlinePatients}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Offline</p>
              <p className="text-2xl font-bold text-gray-900">{offlinePatients}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search patients by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No patients yet</h3>
          <p className="text-gray-500">
            Patients will appear here once they book appointments with you
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/patient/${patient.id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{patient.name}</h3>
                  {patient.user?.email && (
                    <p className="text-sm text-gray-500 truncate">{patient.user.email}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {patient.lastAppointment && (
                      <>
                        <span className="text-xs flex items-center gap-1 text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(patient.lastAppointment.scheduledAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full flex items-center gap-1">
                          {patient.lastAppointment.type === 'ONLINE' ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {patient.lastAppointment.type}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {patient.appointmentCount} appointment{patient.appointmentCount !== 1 ? 's' : ''}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}