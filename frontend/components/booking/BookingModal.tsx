'use client';

import { useState } from 'react';
import { X, AlertCircle, Calendar, Clock, Users, ArrowRight, ChevronRight, Loader2 } from 'lucide-react';

interface SlotInfo {
  date: string;
  startTime: string;
  endTime: string;
  bookedCount: number;
  maxCapacity: number;
}

interface AlternativeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  bookedCount: number;
  remainingCapacity: number;
  isAvailable: boolean;
}

interface BookingError {
  type: string;
  message: string;
  suggestion: string;
  slotInfo?: SlotInfo;
  alternatives?: {
    sameDay: AlternativeSlot[];
    nearbyDays: AlternativeSlot[];
  };
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: BookingError | null;
  onSelectAlternative?: (slotId: string) => void;
  onRetry?: () => void;
}

export function BookingModal({ isOpen, onClose, error, onSelectAlternative, onRetry }: BookingModalProps) {
  const [selectedAltSlot, setSelectedAltSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !error) return null;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSelectAlternative = (slotId: string) => {
    setSelectedAltSlot(slotId);
    if (onSelectAlternative) {
      setLoading(true);
      onSelectAlternative(slotId);
      setTimeout(() => setLoading(false), 1000);
    }
  };

  // ==================== SLOT FULL ERROR ====================
  if (error.type === 'SLOT_FULL') {
    const hasSameDay = error.alternatives?.sameDay && error.alternatives.sameDay.length > 0;
    const hasNearbyDays = error.alternatives?.nearbyDays && error.alternatives.nearbyDays.length > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Booking Unavailable</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Main Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-medium">{error.message}</p>
              {error.slotInfo && (
                <div className="mt-2 text-sm text-amber-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(error.slotInfo.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(error.slotInfo.startTime)} - {formatTime(error.slotInfo.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{error.slotInfo.bookedCount} of {error.slotInfo.maxCapacity} slots booked</span>
                  </div>
                </div>
              )}
            </div>

            {/* Alternatives Section */}
            {(hasSameDay || hasNearbyDays) && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-blue-500" />
                  Available Alternatives
                </h3>

                {/* Same Day Slots */}
                {hasSameDay && (
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">Today</p>
                    <div className="space-y-2">
                      {error.alternatives?.sameDay.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => handleSelectAlternative(slot.id)}
                          disabled={loading}
                          className={`w-full text-left p-3 border rounded-xl transition-all hover:border-blue-400 hover:bg-blue-50 ${
                            selectedAltSlot === slot.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">
                                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {slot.remainingCapacity} slots available
                              </p>
                            </div>
                            {loading && selectedAltSlot === slot.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                              <ArrowRight className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby Days */}
                {hasNearbyDays && (
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">Next Few Days</p>
                    <div className="space-y-2">
                      {error.alternatives?.nearbyDays.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => handleSelectAlternative(slot.id)}
                          disabled={loading}
                          className={`w-full text-left p-3 border rounded-xl transition-all hover:border-blue-400 hover:bg-blue-50 ${
                            selectedAltSlot === slot.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">{formatDate(slot.date)}</span>
                                <span className="text-gray-400">|</span>
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {slot.remainingCapacity} slots available
                              </p>
                            </div>
                            {loading && selectedAltSlot === slot.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                              <ArrowRight className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Alternatives */}
            {!hasSameDay && !hasNearbyDays && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-blue-800 font-medium">No alternative slots available</p>
                <p className="text-sm text-blue-600 mt-1">
                  Please check back later or try a different doctor.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Try Another Date
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== OTHER ERRORS ====================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6">
        <div className="text-center">
          <div className="bg-red-100 p-3 rounded-full inline-flex mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error.message}</h2>
          <p className="text-gray-600 mb-6">{error.suggestion}</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            OK, Got It
          </button>
        </div>
      </div>
    </div>
  );
}