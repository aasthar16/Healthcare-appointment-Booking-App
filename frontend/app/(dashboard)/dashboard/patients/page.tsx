'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Users, User, Mail, Calendar } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  userId: string;
  user?: {
    email: string;
  };
  appointments?: any[];
}

export default function PatientsPage() {
  const { data: session, status } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role === 'DOCTOR') {
      fetchPatients();
    }
  }, [session]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/patients/my-patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'DOCTOR') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
        <p className="text-gray-600 mt-1">
          View and manage your patient roster
        </p>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No patients yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Patients will appear here once they book appointments with you
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <p className="text-sm text-gray-600">{patient.user?.email}</p>
                  </div>
                  {patient.appointments && (
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {patient.appointments.length} appointments
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}