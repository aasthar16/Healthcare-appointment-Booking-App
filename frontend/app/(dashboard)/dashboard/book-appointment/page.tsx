'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Stethoscope, DollarSign, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { BookingModal } from '@/components/booking/BookingModal';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  id?: string;
}

export default function BookAppointmentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams.get('doctorId');
  const { data: session } = useSession();

  const [doctor, setDoctor] = useState<any>(null);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [reason, setReason] = useState('');
  const [appointmentType, setAppointmentType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [loading, setLoading] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  
  // ✅ NEW: For modal and booking
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingError, setBookingError] = useState<any>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (doctorId) {
      fetchDoctor();
    }
  }, [doctorId]);

  useEffect(() => {
    if (doctorId && date) {
      fetchAvailableSlots();
    }
  }, [doctorId, date]);

  const fetchDoctor = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/doctors/detail/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setDoctor(data);
    } catch (error) {
      console.error('Error fetching doctor:', error);
      toast.error('Failed to load doctor details');
      router.push('/dashboard/doctors');
    }
  };

  const fetchAvailableSlots = async () => {
    setFetchingSlots(true);
    try {
      const response = await fetch(`http://localhost:4000/api/availability/doctor/${doctorId}?date=${date}`);
      const slots: TimeSlot[] = await response.json();
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    } finally {
      setFetchingSlots(false);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
  console.log('🖱️ Slot clicked:', slot);
  
  if (!slot.isAvailable) {
    toast.warning('This slot is not available');
    return;
  }

  // ✅ Use startTime as identifier if id is not available
  const slotId = slot.id || slot.startTime;
  
  if (!slotId) {
    toast.warning('Slot ID not available, please try another slot');
    return;
  }

  setSelectedSlotId(slotId);
  setTime(slot.startTime);
  toast.success(`Selected: ${slot.startTime} - ${slot.endTime}`);
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !time) {
      toast.error('Please select date and time');
      return;
    }

    if (!selectedSlotId) {
      toast.error('Please select a valid time slot');
      return;
    }

    const appointmentDate = new Date(`${date}T${time}:00`);
    if (appointmentDate <= new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    setBookingInProgress(true);

    try {
      const response = await fetch('http://localhost:4000/api/bookings/book-friendly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          doctorId: doctorId,
          availabilityId: selectedSlotId,
          scheduledAt: appointmentDate.toISOString(),
          type: appointmentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // ✅ Check if it's a structured error with alternatives
        if (data.type && data.alternatives) {
          setBookingError({
            type: data.type,
            message: data.message,
            suggestion: data.suggestion || 'Please try a different time slot.',
            slotInfo: data.slotInfo,
            alternatives: data.alternatives,
          });
          setModalOpen(true);
          setBookingInProgress(false);
          return;
        }
        throw new Error(data.message || 'Failed to book appointment');
      }

      setQueuePosition(data.queueNumber);
      toast.success(data.message || 'Appointment booked successfully!');
      setTimeout(() => router.push('/dashboard/appointments'), 2000);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleSelectAlternative = (slotId: string) => {
    // ✅ Close modal and book the alternative slot
    setModalOpen(false);
    setBookingError(null);
    setSelectedSlotId(slotId);
    
    // Find the slot to get its time
    const allSlots = [...(bookingError?.alternatives?.sameDay || []), ...(bookingError?.alternatives?.nearbyDays || [])];
    const slot = allSlots.find((s: any) => s.id === slotId);
    if (slot) {
      setTime(slot.startTime);
      // Auto-submit after a short delay
      setTimeout(() => {
        const fakeEvent = new Event('submit') as any;
        handleSubmit(fakeEvent);
      }, 500);
    }
  };

  const handleRetry = () => {
    setModalOpen(false);
    setBookingError(null);
    setDate('');
    setTime('');
    setSelectedSlotId(null);
  };

  if (!doctor) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {queuePosition && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Request Sent!</h3>
              <p className="text-green-700 text-sm">
                You are #{queuePosition} in queue for this time slot. Doctor will confirm soon.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{doctor.name}</h1>
            <p className="text-blue-600">{doctor.specialty}</p>
            <p className="text-gray-600 text-sm mt-1">
              ₹{doctor.consultationFee || 500} per consultation
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Select Time</label>
          {fetchingSlots ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot: TimeSlot) => (
                <button
                  key={slot.id || slot.startTime}
                  type="button"
                  onClick={() => handleSelectSlot(slot)}
                  disabled={!slot.isAvailable}
                  className={`p-2 rounded-lg border text-sm transition-all ${
                    selectedSlotId === (slot.id || slot.startTime)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : slot.isAvailable
                      ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                  {slot.isAvailable && (
                    <div className="text-xs text-green-600 mt-1">Available</div>
                  )}
                  {!slot.isAvailable && (
                    <div className="text-xs text-red-400 mt-1">Full</div>
                  )}
                </button>
              ))}
            </div>
          )}
          {availableSlots.length === 0 && !fetchingSlots && date && (
            <p className="text-sm text-red-500 mt-1">No available slots for this date</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Appointment Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="ONLINE"
                checked={appointmentType === 'ONLINE'}
                onChange={() => setAppointmentType('ONLINE')}
              />
              Online
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="OFFLINE"
                checked={appointmentType === 'OFFLINE'}
                onChange={() => setAppointmentType('OFFLINE')}
              />
              In-Person
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Reason for Visit</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Describe your symptoms..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={bookingInProgress || !selectedSlotId}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {bookingInProgress ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>

      {/* ✅ Booking Modal */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setBookingError(null);
        }}
        error={bookingError}
        onSelectAlternative={handleSelectAlternative}
        onRetry={handleRetry}
      />
    </div>
  );
}