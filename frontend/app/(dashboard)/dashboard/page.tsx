'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Calendar, Users, Stethoscope, Activity, TrendingUp } from 'lucide-react';
import AppointmentList from '@/components/appointments/AppointmentList';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({
    appointments: 0,
    doctors: 0,
    patients: 0,
    healthScore: 0
  });

  useEffect(() => {
    if (session?.user) {
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    try {
      // Fetch appointments count
      const appointmentsRes = await apiClient.get('/bookings/mine');
      const appointments = appointmentsRes.data;
      
      // For doctors, fetch patients count
      if (session?.user?.role === 'DOCTOR') {
        // You might need an endpoint for this
        setStats(prev => ({
          ...prev,
          appointments: appointments.length
        }));
      } else {
        // For patients, fetch doctors count
        const doctorsRes = await apiClient.get('/bookings/doctors');
        setStats(prev => ({
          ...prev,
          appointments: appointments.length,
          doctors: doctorsRes.data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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

  const dashboardStats = [
    {
      name: 'Total Appointments',
      value: stats.appointments.toString(),
      icon: Calendar,
      change: '+0%',
    },
    {
      name: session.user.role === 'DOCTOR' ? 'Patients' : 'Doctors Available',
      value: session.user.role === 'DOCTOR' ? stats.patients.toString() : stats.doctors.toString(),
      icon: session.user.role === 'DOCTOR' ? Users : Stethoscope,
      change: 'Active',
    },
    {
      name: 'Health Score',
      value: 'Good',
      icon: Activity,
      change: 'Keep it up!',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.email?.split('@')[0]}
        </h1>
        <p className="text-gray-600 mt-1">
          Here's a summary of your healthcare activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    {stat.change}
                  </p>
                </div>
                <Icon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {session.user.role === 'DOCTOR' ? 'Today\'s Appointments' : 'Upcoming Appointments'}
        </h2>
        <AppointmentList role={session.user.role as any} />
      </div>
    </div>
  );
}