
'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import ChatBox from '@/components/chat/ChatBox';

export default function ChatPage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const { data: session } = useSession();
  const [doctorName, setDoctorName] = useState('');
  const [patientName, setPatientName] = useState('');

  useEffect(() => {
    if (appointmentId && session?.accessToken) {
      fetchAppointmentDetails();
    }
  }, [appointmentId, session]);

  const fetchAppointmentDetails = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/bookings/mine`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const appointments = await response.json();
      const apt = appointments.find((a: any) => a.id === appointmentId);
      if (apt) {
        setDoctorName(apt.doctor?.name);
        setPatientName(apt.patient?.name);
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Secure Medical Chat</h1>
      <ChatBox 
        appointmentId={appointmentId} 
        doctorName={doctorName}
        patientName={patientName}
      />
    </div>
  );
}
