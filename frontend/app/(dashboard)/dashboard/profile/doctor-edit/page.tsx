'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Stethoscope, DollarSign, User, Mail, BookOpen, Loader2 } from 'lucide-react';

interface DoctorProfile {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  bio: string | null;
  consultationFee: number | null;
  verificationStatus: 'PENDING_DOCUMENTS' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  defaultMaxCapacity?: number;
}

export default function DoctorEditProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    specialty: '',
    bio: '',
    consultationFee: '',
    defaultMaxCapacity: 5,
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'DOCTOR') {
      router.push('/dashboard/profile');
      return;
    }

    fetchProfile();
  }, [session, status]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/doctors/user/${session?.user?.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDoctorProfile(data);
        setEditForm({
          name: data.name || '',
          specialty: data.specialty || '',
          bio: data.bio || '',
          consultationFee: data.consultationFee?.toString() || '',
          defaultMaxCapacity: data.defaultMaxCapacity || 5,
        });
      } else if (response.status === 404) {
        toast.error('Doctor profile not found. Please complete onboarding first.');
        router.push('/dashboard/onboarding');
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {};
      
      // Check name change
      if (editForm.name && editForm.name !== doctorProfile?.name) {
        payload.name = editForm.name;
      }
      
      // Check specialty change
      if (editForm.specialty && editForm.specialty !== doctorProfile?.specialty) {
        payload.specialty = editForm.specialty;
      }
      
      // Check bio change
      if (editForm.bio !== doctorProfile?.bio) {
        payload.bio = editForm.bio;
      }
      
      // Check consultation fee change
      if (editForm.consultationFee) {
        const fee = parseInt(editForm.consultationFee);
        if (fee !== doctorProfile?.consultationFee) {
          payload.consultationFee = fee;
        }
      }

      // ✅ Check defaultMaxCapacity change (BEFORE the "no changes" check)
      const newMaxCapacity = editForm.defaultMaxCapacity;
      
      if (newMaxCapacity !== doctorProfile?.defaultMaxCapacity) {
        payload.defaultMaxCapacity = newMaxCapacity;
      }

      // ✅ Check if there are any changes
      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save');
        setSubmitting(false);
        return;
      }

      // Send the update
      const response = await fetch(`${API_BASE}/doctors/update/${doctorProfile?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setDoctorProfile(data);
      toast.success('Profile updated successfully!');
      await update({ name: editForm.name });
      router.push('/dashboard/profile');
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session?.user?.role !== 'DOCTOR') {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard/profile')}
          className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Doctor Profile</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {doctorProfile?.verificationStatus === 'VERIFIED' && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              ✅ Verified Doctor - You can update your consultation fee and bio.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                disabled={doctorProfile?.verificationStatus === 'VERIFIED'}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  doctorProfile?.verificationStatus === 'VERIFIED' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>
            {doctorProfile?.verificationStatus === 'VERIFIED' && (
              <p className="text-xs text-gray-400 mt-1">Name cannot be changed. Contact support for updates.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={editForm.specialty}
                onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                disabled={doctorProfile?.verificationStatus === 'VERIFIED'}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  doctorProfile?.verificationStatus === 'VERIFIED' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>
            {doctorProfile?.verificationStatus === 'VERIFIED' && (
              <p className="text-xs text-gray-400 mt-1">Specialty cannot be changed. Contact support for updates.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <textarea
                rows={4}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell patients about yourself..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={editForm.consultationFee}
                onChange={(e) => setEditForm({ ...editForm, consultationFee: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="100"
                placeholder="e.g. 1500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Patients Per Slot
            </label>
            <select
              value={editForm.defaultMaxCapacity}
              onChange={(e) => setEditForm({ ...editForm, defaultMaxCapacity: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 patient per slot</option>
              <option value="2">2 patients per slot</option>
              <option value="3">3 patients per slot</option>
              <option value="4">4 patients per slot</option>
              <option value="5">5 patients per slot</option>
              <option value="6">6 patients per slot</option>
              <option value="7">7 patients per slot</option>
              <option value="8">8 patients per slot</option>
              <option value="9">9 patients per slot</option>
              <option value="10">10 patients per slot</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Maximum number of patients that can book the same time slot
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/profile')}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}