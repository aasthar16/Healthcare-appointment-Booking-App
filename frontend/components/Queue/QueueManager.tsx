'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Users, Clock, CheckCircle, XCircle, UserCheck, Calendar, Video, MapPin, Bell } from 'lucide-react';

interface QueueEntry {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  queueNumber: number;
  status: string;
  position: number;
  estimatedWaitTime: number;
  scheduledAt?: string;
  type?: string;
  reason?: string;
  patient: {
    name: string;
  };
}

interface QueueManagerProps {
  doctorId: string;
  role: 'PATIENT' | 'DOCTOR';
  appointmentId?: string;
}

const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
);

const SmallSpinner = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
);

export default function QueueManager({ doctorId, role, appointmentId }: QueueManagerProps) {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [myQueueEntry, setMyQueueEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<QueueEntry | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/queue/doctor/${doctorId}`, {
        headers: { 'Authorization': `Bearer ${session?.accessToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueue(data);
        
        if (role === 'PATIENT' && appointmentId) {
          const myEntry = data.find((entry: QueueEntry) => entry.appointmentId === appointmentId);
          setMyQueueEntry(myEntry || null);
        }
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorId, session?.accessToken, role, appointmentId]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchQueue();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const joinQueue = async () => {
    if (!appointmentId) return;
    setJoining(true);
    try {
      const response = await fetch(`http://localhost:4000/api/queue/appointment/${appointmentId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        toast.success('Joined queue successfully!');
        fetchQueue();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to join queue');
      }
    } catch (error) {
      toast.error('Failed to join queue');
    } finally {
      setJoining(false);
    }
  };

  const updateStatus = async (queueId: string, status: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/queue/${queueId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}` 
        },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        toast.success(`Patient ${status === 'IN_PROGRESS' ? 'started' : status === 'COMPLETED' ? 'completed' : 'cancelled'}`);
        fetchQueue();
        setSelectedPatient(null);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const sendNotification = (patientName: string) => {
    toast.info(`Notification sent to ${patientName}`);
    // Here you can integrate real notifications via WebSocket or email
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  // Patient View
  if (role === 'PATIENT') {
    if (!myQueueEntry) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Not in Queue</h3>
          <p className="text-gray-500 mb-6">Join the queue to see your position</p>
          <button
            onClick={joinQueue}
            disabled={joining}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {joining ? <SmallSpinner /> : <Users className="h-4 w-4" />}
            {joining ? 'Joining...' : 'Join Queue'}
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Your Queue Status
        </h2>
        <div className="text-center py-6">
          <div className="text-6xl font-bold text-blue-600 mb-2">#{myQueueEntry.queueNumber}</div>
          <p className="text-gray-600">Current Position: {myQueueEntry.position}</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-gray-500">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Estimated Wait: {myQueueEntry.estimatedWaitTime} minutes</span>
          </div>
          {myQueueEntry.status === 'IN_PROGRESS' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">🎥 Your consultation is in progress!</p>
            </div>
          )}
          {refreshing && (
            <div className="flex justify-center mt-4">
              <SmallSpinner />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Doctor View
  const waiting = queue.filter(q => q.status === 'WAITING');
  const inProgress = queue.filter(q => q.status === 'IN_PROGRESS');
  const completed = queue.filter(q => q.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Waiting</p>
              <p className="text-2xl font-bold text-yellow-800">{waiting.length}</p>
            </div>
            <Users className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">In Progress</p>
              <p className="text-2xl font-bold text-blue-800">{inProgress.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Completed Today</p>
              <p className="text-2xl font-bold text-green-800">{completed.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Patient Details</h3>
            <div className="space-y-3">
              <p><span className="font-semibold">Name:</span> {selectedPatient.patient.name}</p>
              <p><span className="font-semibold">Queue Number:</span> #{selectedPatient.queueNumber}</p>
              <p><span className="font-semibold">Status:</span> {selectedPatient.status}</p>
              {selectedPatient.scheduledAt && (
                <p><span className="font-semibold">Appointment Time:</span> {new Date(selectedPatient.scheduledAt).toLocaleString()}</p>
              )}
              {selectedPatient.type && (
                <p><span className="font-semibold">Type:</span> {selectedPatient.type === 'ONLINE' ? 'Online' : 'In-Person'}</p>
              )}
              {selectedPatient.reason && (
                <p><span className="font-semibold">Reason:</span> {selectedPatient.reason}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              {selectedPatient.status === 'WAITING' && (
                <button
                  onClick={() => {
                    updateStatus(selectedPatient.id, 'IN_PROGRESS');
                    sendNotification(selectedPatient.patient.name);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Start Consultation
                </button>
              )}
              {selectedPatient.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => updateStatus(selectedPatient.id, 'COMPLETED')}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Complete & Mark Done
                </button>
              )}
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            Current Queue - {queue.length} Patients
          </h3>
        </div>
        {queue.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>No patients in queue</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {queue.map((entry, index) => (
              <div 
                key={entry.id} 
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedPatient(entry)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      entry.status === 'IN_PROGRESS' ? 'bg-green-100' : 'bg-blue-100'
                    )}>
                      <span className={cn(
                        "font-bold",
                        entry.status === 'IN_PROGRESS' ? 'text-green-600' : 'text-blue-600'
                      )}>#{entry.queueNumber}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.patient.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Est: {entry.estimatedWaitTime} min
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs",
                          entry.status === 'WAITING' ? 'bg-yellow-100 text-yellow-700' :
                          entry.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        )}>
                          {entry.status === 'WAITING' ? 'Waiting' : entry.status === 'IN_PROGRESS' ? 'In Progress' : entry.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {entry.status === 'WAITING' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(entry.id, 'IN_PROGRESS');
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="h-3 w-3" />
                        Start
                      </button>
                    )}
                    {entry.status === 'IN_PROGRESS' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(entry.id, 'COMPLETED');
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </button>
                    )}
                    {entry.status === 'WAITING' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(entry.id, 'CANCELLED');
                        }}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatient(entry);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {refreshing && (
        <div className="flex justify-center">
          <SmallSpinner />
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          How to Manage Queue
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Click on a patient to view full details</li>
          <li>• Click "Start" to begin consultation - patient will be notified</li>
          <li>• Click "Complete" after finishing the consultation</li>
          <li>• Patients are automatically ordered by queue number</li>
        </ul>
      </div>
    </div>
  );
}