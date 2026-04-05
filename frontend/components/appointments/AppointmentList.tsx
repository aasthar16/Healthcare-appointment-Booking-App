'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Clock, User, Video, MapPin, CheckCircle, XCircle, Clock as ClockIcon, MessageCircle, Star, AlertTriangle } from 'lucide-react';
import RatingModal from '@/components/ratings/RatingModal';
import PaymentButton from '@/components/payment/PaymentButton';

interface Appointment {
  id: string;
  scheduledAt: string;
  originalScheduledAt?: string;
  status: string;
  durationMinutes: number;
  type: 'ONLINE' | 'OFFLINE';
  queueNumber: number;
  videoLink?: string;
  notes?: string;
  doctor?: {
    id: string;
    name: string;
    specialty: string;
    consultationFee?: number;
  };
  patient?: {
    id: string;
    name: string;
  };
}

export default function AppointmentList({ role }: { role: 'PATIENT' | 'DOCTOR' }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [proposedTime, setProposedTime] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingAppointment, setRatingAppointment] = useState<Appointment | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<Record<string, string>>({});

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/bookings/mine', {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setAppointments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStatus = async (appointmentId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/payments/status/${appointmentId}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPaymentStatus(prev => ({ ...prev, [appointmentId]: data.status }));
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchAppointments();
    }
  }, [session]);

  useEffect(() => {
    const scheduled = appointments.filter(apt => apt.status === 'SCHEDULED');
    if (scheduled.length > 0 && session?.accessToken) {
      scheduled.forEach(apt => fetchPaymentStatus(apt.id));
    }
  }, [appointments, session?.accessToken]);

  const acceptAppointment = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/bookings/${id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        alert('Appointment accepted!');
        fetchAppointments();
      }
    } catch (error) {
      alert('Failed to accept');
    }
  };

  const rejectAppointment = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/bookings/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        alert('Appointment rejected');
        fetchAppointments();
      }
    } catch (error) {
      alert('Failed to reject');
    }
  };

  const proposeNewTime = async (id: string) => {
    if (!proposedTime) {
      alert('Please select a new time');
      return;
    }
    try {
      const response = await fetch(`http://localhost:4000/api/bookings/${id}/propose-time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken}` },
        body: JSON.stringify({ scheduledAt: proposedTime }),
      });
      if (response.ok) {
        alert('New time proposed!');
        setSelectedAppointment(null);
        fetchAppointments();
      }
    } catch (error) {
      alert('Failed to propose');
    }
  };

  const acceptCounterOffer = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/bookings/${id}/accept-counter`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        alert('Appointment confirmed!');
        fetchAppointments();
      }
    } catch (error) {
      alert('Failed to confirm');
    }
  };

  const rejectCounterOffer = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/bookings/${id}/reject-counter`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        alert('Appointment cancelled');
        fetchAppointments();
      }
    } catch (error) {
      alert('Failed to cancel');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  const pending = appointments.filter(apt => apt.status === 'PENDING');
  const counterOffers = appointments.filter(apt => apt.status === 'COUNTER_OFFER');
  const scheduled = appointments.filter(apt => apt.status === 'SCHEDULED');
  const rescheduleRequired = appointments.filter(apt => apt.status === 'RESCHEDULE_REQUIRED');
  const completed = appointments.filter(apt => apt.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Pending Requests - Doctor View */}
      {role === 'DOCTOR' && pending.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Pending Requests ({pending.length})</h3>
          {pending.map((apt) => (
            <div key={apt.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{apt.patient?.name}</p>
                  <p className="text-sm text-gray-600">{format(new Date(apt.scheduledAt), 'PPP p')}</p>
                  <p className="text-sm text-gray-500">Queue Position: #{apt.queueNumber}</p>
                  {apt.notes && <p className="text-sm text-gray-500 mt-1">Reason: {apt.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptAppointment(apt.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm">Accept</button>
                  <button onClick={() => setSelectedAppointment(apt)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">Propose New Time</button>
                  <button onClick={() => rejectAppointment(apt.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counter Offers - Patient View */}
      {role === 'PATIENT' && counterOffers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Doctor's Proposed Times</h3>
          {counterOffers.map((apt) => (
            <div key={apt.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Dr. {apt.doctor?.name}</p>
                  <p className="text-sm text-gray-600">Proposed: {format(new Date(apt.scheduledAt), 'PPP p')}</p>
                  {apt.originalScheduledAt && (
                    <p className="text-sm text-gray-500">Original: {format(new Date(apt.originalScheduledAt), 'PPP p')}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptCounterOffer(apt.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm">Accept</button>
                  <button onClick={() => rejectCounterOffer(apt.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm">Decline</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Required Appointments */}
      {rescheduleRequired.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-800 mb-3">Action Required ({rescheduleRequired.length})</h3>
          {rescheduleRequired.map((apt) => (
            <div key={apt.id} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{role === 'PATIENT' ? apt.doctor?.name : apt.patient?.name}</p>
                  <p className="text-sm text-gray-600">{format(new Date(apt.scheduledAt), 'PPP p')}</p>
                  <p className="text-sm text-gray-500">Original time slot</p>
                </div>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Reschedule Required</span>
              </div>
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700 flex-1">
                  This appointment has been cancelled. The doctor is no longer available at this time.
                </p>
                <button
                  onClick={() => router.push(`/dashboard/book-appointment?doctorId=${apt.doctor?.id}`)}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Book New Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmed Appointments */}
      {scheduled.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-800 mb-3">Upcoming Appointments</h3>
          {scheduled.map((apt) => (
            <div key={apt.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{role === 'PATIENT' ? apt.doctor?.name : apt.patient?.name}</p>
                  <p className="text-sm text-gray-500">{apt.doctor?.specialty}</p>
                  <p className="text-sm text-gray-600 mt-1">{format(new Date(apt.scheduledAt), 'PPP p')}</p>
                  <p className="text-xs text-gray-400 mt-1">Queue Position: #{apt.queueNumber}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs h-fit">Confirmed</span>
              </div>
              <div className="flex gap-3 mt-3">
                {apt.type === 'ONLINE' && apt.videoLink && (
                  <a href={apt.videoLink} target="_blank" className="inline-flex items-center gap-1 text-blue-600 text-sm">
                    <Video className="h-3 w-3" /> Join Video Call
                  </a>
                )}
                <button
                  onClick={() => router.push(`/dashboard/chat/${apt.id}`)}
                  className="inline-flex items-center gap-1 text-green-600 text-sm hover:text-green-700"
                >
                  <MessageCircle className="h-3 w-3" /> Open Chat
                </button>
              </div>
              {/* Payment Section - Only for Patients */}
              {role === 'PATIENT' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {paymentStatus[apt.id] === 'captured' ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Payment Completed
                    </div>
                  ) : (
                    <PaymentButton
                      appointmentId={apt.id}
                      amount={apt.doctor?.consultationFee || 500}
                      doctorName={apt.doctor?.name}
                      onSuccess={() => {
                        fetchPaymentStatus(apt.id);
                      }}
                      onFailure={() => {
                        console.log('Payment failed');
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed Appointments with Rating */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Past Appointments</h3>
          {completed.map((apt) => (
            <div key={apt.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{role === 'PATIENT' ? apt.doctor?.name : apt.patient?.name}</p>
                  <p className="text-sm text-gray-500">{apt.doctor?.specialty}</p>
                  <p className="text-sm text-gray-600 mt-1">{format(new Date(apt.scheduledAt), 'PPP p')}</p>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs h-fit">Completed</span>
              </div>
              {role === 'PATIENT' && (
                <button
                  onClick={() => {
                    setRatingAppointment(apt);
                    setShowRatingModal(true);
                  }}
                  className="mt-3 flex items-center gap-1 text-yellow-600 text-sm hover:text-yellow-700"
                >
                  <Star className="h-4 w-4" /> Rate this appointment
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Propose Time Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Propose New Time for {selectedAppointment.patient?.name}</h3>
            <input
              type="datetime-local"
              value={proposedTime}
              onChange={(e) => setProposedTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
            <div className="flex gap-3">
              <button onClick={() => proposeNewTime(selectedAppointment.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Propose</button>
              <button onClick={() => setSelectedAppointment(null)} className="flex-1 border border-gray-300 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && ratingAppointment && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setRatingAppointment(null);
          }}
          doctorId={ratingAppointment.doctor?.id || ''}
          appointmentId={ratingAppointment.id}
          doctorName={ratingAppointment.doctor?.name || ''}
          onRatingSubmitted={() => {
            fetchAppointments();
          }}
        />
      )}

      {appointments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No appointments found</p>
        </div>
      )}
    </div>
  );
}
