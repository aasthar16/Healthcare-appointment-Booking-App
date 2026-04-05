'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Save, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TimeSlot {
  id?: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function DoctorAvailabilityCalendar() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDoctorId();
    }
  }, [session]);

  useEffect(() => {
    if (doctorId) {
      fetchAvailability();
    }
  }, [doctorId, currentDate]);

  const fetchDoctorId = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/doctors/user/${session?.user?.id}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const data = await response.json();
      setDoctorId(data.id);
    } catch (error) {
      console.error('Error fetching doctor ID:', error);
    }
  };

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const response = await fetch(`http://localhost:4000/api/availability/doctor/${doctorId}?date=${dateStr}`);
      const data = await response.json();
      setSlots(data);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (index: number) => {
    const newSlots = [...slots];
    newSlots[index].isAvailable = !newSlots[index].isAvailable;
    setSlots(newSlots);
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const blockedSlots = slots.filter(slot => !slot.isAvailable).map(slot => slot.startTime);
      
      const response = await fetch('http://localhost:4000/api/availability/unavailable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          date: format(currentDate, 'yyyy-MM-dd'),
          slots: blockedSlots,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Availability saved! ${result.affectedAppointments > 0 ? `${result.affectedAppointments} appointment(s) were auto-cancelled.` : ''}`);
        fetchAvailability();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const goToPreviousDay = () => {
    setCurrentDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Manage Availability</h2>
          <p className="text-sm text-gray-500 mt-1">Block time slots when you're NOT available</p>
        </div>
        <button
          onClick={saveAvailability}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button onClick={goToPreviousDay} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
          <button onClick={goToToday} className="text-sm text-blue-600 hover:underline mt-1">
            Today
          </button>
        </div>
        <button onClick={goToNextDay} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {slots.map((slot, index) => (
          <button
            key={slot.startTime}
            onClick={() => toggleSlot(index)}
            className={`
              p-3 rounded-lg border-2 text-center transition-all
              ${slot.isAvailable 
                ? 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100' 
                : 'bg-red-50 border-red-500 text-red-700 hover:bg-red-100'
              }
            `}
          >
            <Clock className="h-4 w-4 mx-auto mb-1" />
            <span className="text-sm font-medium">
              {slot.startTime} - {slot.endTime}
            </span>
            <span className="text-xs block mt-1">
              {slot.isAvailable ? 'Available' : 'Blocked'}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Note:</p>
            <p>Blocking a slot will automatically cancel any existing appointments in that time slot. 
            Affected patients will be notified immediately.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Tip:</span> Green slots are available for patients to book. 
          Click on a slot to block/unblock it. Red slots will not be shown to patients.
        </p>
      </div>
    </div>
  );
}
