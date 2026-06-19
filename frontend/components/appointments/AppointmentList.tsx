'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope,
  Star,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Loader2,
  Video,
  MapPin,
  Check,
  X,
  MessageCircle,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'PENDING' | 'COUNTER_OFFER' | 'REJECTED' | 'RESCHEDULE_REQUIRED';
  type: 'ONLINE' | 'OFFLINE';
  durationMinutes: number;
  queueNumber: number | null;
  videoLink: string | null;
  notes: string | null;
  isPaid?: boolean;
  hasRating?: boolean;
  rating?: {
    id: string;
    score: number;
    comment: string | null;
    createdAt: string;
  } | null;
  doctor: {
    id: string;
    name: string;
    specialty: string;
    avatarUrl: string | null;
    consultationFee?: number;
  };
  patient?: {
    id: string;
    name: string;
  };
}

interface AppointmentListProps {
  role: 'DOCTOR' | 'PATIENT';
}

export default function AppointmentList({ role }: AppointmentListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // ✅ Access status (auto-checked, no button needed)
  const [accessStatus, setAccessStatus] = useState<Record<string, any>>({});

  // ✅ Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAppointment, setPaymentAppointment] = useState<Appointment | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetchAppointments();
  }, []);

  // ✅ Auto-check access for all appointments after they load
  useEffect(() => {
    if (appointments.length > 0) {
      appointments.forEach(app => {
        checkAppointmentAccess(app.id);
      });
    }
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/bookings/mine`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      } else {
        toast.error('Failed to load appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Auto-check access (no user interaction needed)
  const checkAppointmentAccess = async (appointmentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/access`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAccessStatus(prev => ({ ...prev, [appointmentId]: data }));
      }
    } catch (error) {
      console.error('Error checking access:', error);
    }
  };

  const handleAcceptAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to accept this appointment?')) return;
    
    setActionLoading(appointmentId);
    try {
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/accept`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Appointment accepted successfully!');
        fetchAppointments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to accept appointment');
      }
    } catch (error) {
      console.error('Accept error:', error);
      toast.error('Failed to accept appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to reject this appointment?')) return;
    
    setActionLoading(appointmentId);
    try {
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Appointment rejected');
        fetchAppointments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReschedule = (appointment: Appointment) => {
    setRescheduleAppointment(appointment);
    const date = new Date(appointment.scheduledAt);
    setNewDate(date.toISOString().split('T')[0]);
    setNewTime(date.toTimeString().slice(0, 5));
    setRescheduleReason('');
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleAppointment || !newDate || !newTime) {
      toast.error('Please select a date and time');
      return;
    }

    const scheduledAt = new Date(`${newDate}T${newTime}:00.000Z`);
    
    if (scheduledAt <= new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    setActionLoading(rescheduleAppointment.id);
    try {
      const response = await fetch(`${API_BASE}/bookings/${rescheduleAppointment.id}/propose-time`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('New time proposed successfully!');
        setShowRescheduleModal(false);
        setRescheduleAppointment(null);
        fetchAppointments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to propose new time');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error('Failed to propose new time');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptCounterOffer = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/accept-counter`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('New time accepted!');
        fetchAppointments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to accept new time');
      }
    } catch (error) {
      console.error('Accept counter error:', error);
      toast.error('Failed to accept new time');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCounterOffer = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/reject-counter`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('New time declined');
        fetchAppointments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to decline new time');
      }
    } catch (error) {
      console.error('Reject counter error:', error);
      toast.error('Failed to decline new time');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    if (!confirm('Mark this appointment as completed?')) return;
    
    setActionLoading(appointmentId);
    try {
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Appointment marked as completed');
        fetchAppointments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to complete appointment');
      }
    } catch (error) {
      console.error('Complete error:', error);
      toast.error('Failed to complete appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    setActionLoading(appointmentId);
    try {
      const response = await fetch(`${API_BASE}/bookings/${appointmentId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Appointment cancelled successfully');
        fetchAppointments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRateAppointment = (appointment: Appointment) => {
    if (appointment.hasRating) {
      toast.info('You have already rated this appointment');
      return;
    }
    
    setSelectedAppointment(appointment);
    setRating(0);
    setReview('');
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!selectedAppointment || rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (selectedAppointment.hasRating) {
      toast.error('This appointment has already been rated');
      setShowRatingModal(false);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          doctorId: selectedAppointment.doctor.id,
          score: rating,
          comment: review.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Rating submitted successfully!');
        setShowRatingModal(false);
        await fetchAppointments();
        setSelectedAppointment(null);
        setRating(0);
        setReview('');
      } else {
        if (data.message?.toLowerCase().includes('already rated')) {
          toast.error('This appointment has already been rated');
          setShowRatingModal(false);
          await fetchAppointments();
        } else {
          toast.error(data.message || 'Failed to submit rating');
        }
      }
    } catch (error) {
      console.error('Rating error:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayment = (appointment: Appointment) => {
    setPaymentAppointment(appointment);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!paymentAppointment) return;
    toast.info('Payment integration coming soon');
    setShowPaymentModal(false);
    setPaymentAppointment(null);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      PENDING: { icon: ClockIcon, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
      SCHEDULED: { icon: CheckCircle, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Scheduled' },
      CHECKED_IN: { icon: CheckCircle, color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Checked In' },
      IN_PROGRESS: { icon: ClockIcon, color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'In Progress' },
      COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
      CANCELLED: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled'},
      NO_SHOW: { icon: XCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'No Show' },
      COUNTER_OFFER: { icon: RefreshCw, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Counter Offer' },
      REJECTED: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
      RESCHEDULE_REQUIRED: { icon: RefreshCw, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Reschedule Required' },
    };
    return config[status] || config.PENDING;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ONLINE': return <Video className="h-4 w-4" />;
      case 'OFFLINE': return <MapPin className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPending = (status: string) => status === 'PENDING';
  const isScheduled = (status: string) => status === 'SCHEDULED';
  const isCompleted = (status: string) => status === 'COMPLETED';
  const isCounterOffer = (status: string) => status === 'COUNTER_OFFER';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
        <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No appointments yet</h3>
        <p className="text-gray-500">
          {role === 'DOCTOR' 
            ? 'You have no appointments scheduled.' 
            : 'Book your first appointment with a doctor.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {appointments.map((appointment) => {
          const statusConfig = getStatusBadge(appointment.status);
          const StatusIcon = statusConfig.icon;
          
          const canRate = appointment.status === 'COMPLETED' && !appointment.hasRating;
          const alreadyRated = appointment.status === 'COMPLETED' && appointment.hasRating;
          const isActionLoading = actionLoading === appointment.id;
          
          const isOnline = appointment.type === 'ONLINE';
          const hasVideoLink = !!appointment.videoLink;
          
          // ✅ Get access status (auto-checked)
          const access = accessStatus[appointment.id];

          return (
            <div
              key={appointment.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    {role === 'DOCTOR' ? (
                      <User className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Stethoscope className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {role === 'DOCTOR' 
                        ? appointment.patient?.name || 'Patient'
                        : appointment.doctor.name}
                    </h3>
                    {role === 'PATIENT' && (
                      <p className="text-sm text-gray-600">{appointment.doctor.specialty}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(appointment.scheduledAt)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {formatTime(appointment.scheduledAt)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {getTypeIcon(appointment.type)}
                        {appointment.type === 'ONLINE' ? 'Online' : 'Offline'}
                      </div>
                      {appointment.queueNumber && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                          Queue #{appointment.queueNumber}
                        </span>
                      )}
                    </div>
                    {appointment.notes && (
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="text-xs">{appointment.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${statusConfig.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </span>

                  {/* ✅ DOCTOR ACTIONS */}
                  {role === 'DOCTOR' && isPending(appointment.status) && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => handleAcceptAppointment(appointment.id)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectAppointment(appointment.id)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Reject
                      </button>
                      <button
                        onClick={() => handleOpenReschedule(appointment)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Propose Time
                      </button>
                    </div>
                  )}

                  {role === 'DOCTOR' && isScheduled(appointment.status) && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => handleCompleteAppointment(appointment.id)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Complete
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Cancel
                      </button>
                      <button
                        onClick={() => handleOpenReschedule(appointment)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Propose Time
                      </button>
                    </div>
                  )}

                  {/* ✅ PATIENT ACTIONS - Counter Offer */}
                  {role === 'PATIENT' && isCounterOffer(appointment.status) && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => handleAcceptCounterOffer(appointment.id)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Accept New Time
                      </button>
                      <button
                        onClick={() => handleRejectCounterOffer(appointment.id)}
                        disabled={!!isActionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Decline
                      </button>
                    </div>
                  )}

                  {/* ✅ DOCTOR RATING DISPLAY */}
                  {role === 'DOCTOR' && isCompleted(appointment.status) && (
                    <div className="flex items-center gap-2">
                      {appointment.hasRating && appointment.rating && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= (appointment.rating?.score || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-green-700 font-medium">
                            {appointment.rating.score}/5
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ✅ PATIENT RATING - Only show if not already rated */}
                  {role === 'PATIENT' && canRate && (
                    <button
                      onClick={() => handleRateAppointment(appointment)}
                      className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                    >
                      <Star className="h-4 w-4 fill-current" />
                      Rate Doctor
                    </button>
                  )}

                  {/* ✅ Show rating if already rated */}
                  {role === 'PATIENT' && alreadyRated && appointment.rating && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= (appointment.rating?.score || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-green-700 font-medium">
                        Rated {appointment.rating.score}/5
                      </span>
                    </div>
                  )}

                  {/* ✅ CHAT BUTTON - Only if chat is active */}
                  {access?.canChat && (
                    <button
                      onClick={() => router.push(`/dashboard/chat/${appointment.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Chat
                    </button>
                  )}

                  {/* ✅ PAYMENT BUTTON - Only for patient, online, not paid */}
                  {role === 'PATIENT' && access?.requiresPayment && appointment.type === 'ONLINE' && (
                    <button
                      onClick={() => handleOpenPayment(appointment)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <CreditCard className="h-3 w-3" />
                      Pay to Access
                    </button>
                  )}

                  {/* ✅ VIDEO CALL BUTTON */}
                  {access?.canJoinVideo && access?.videoLink && (
                    <a
                      href={access.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      <Video className="h-3 w-3" />
                      Join Video Call
                    </a>
                  )}

                  {/* ✅ Waiting for Video Link */}
                  {isOnline && !hasVideoLink && appointment.status === 'SCHEDULED' && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs">
                      <ClockIcon className="h-3 w-3" />
                      Waiting for video link...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ Reschedule Modal */}
      {showRescheduleModal && rescheduleAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Propose New Time</h2>
            <p className="text-gray-600 mb-4">
              Propose a new time for appointment with <strong>{role === 'DOCTOR' 
                ? rescheduleAppointment.patient?.name || 'Patient'
                : rescheduleAppointment.doctor.name}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide a reason for proposing new time..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRescheduleSubmit}
                disabled={!!actionLoading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Proposing...
                  </>
                ) : (
                  'Propose New Time'
                )}
              </button>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleAppointment(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Rating Modal */}
      {showRatingModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Rate Your Experience</h2>
            <p className="text-gray-600 mb-4">
              How was your appointment with <strong>{selectedAppointment.doctor.name}</strong>?
            </p>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-gray-500 mb-4">
              {rating > 0 ? `${rating} out of 5 stars` : 'Tap a star to rate'}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review (optional)
              </label>
              <textarea
                rows={3}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Share your experience with this doctor..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitRating}
                disabled={submitting || rating === 0}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Rating'
                )}
              </button>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedAppointment(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Payment Modal */}
      {showPaymentModal && paymentAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Payment</h2>
            <p className="text-gray-600 mb-4">
              Pay to access chat and video call for your appointment with <strong>{paymentAppointment.doctor.name}</strong>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                💳 Amount: ₹{paymentAppointment.doctor.consultationFee || 500}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Once paid, you can chat with the doctor and join the video call.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePayment}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Pay Now
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAppointment(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}