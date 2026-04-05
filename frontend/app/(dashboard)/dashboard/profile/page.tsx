// frontend/app/(dashboard)/dashboard/profile/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Stethoscope, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  Phone,
  MapPin,
  BookOpen,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface DoctorProfile {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  bio: string | null;
  avatarUrl: string | null;
  consultationFee: number | null;
  verificationStatus: 'PENDING_DOCUMENTS' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  licenseDocUrl: string | null;
  degreeDocUrl: string | null;
  createdAt: string;
  averageRating: number | null;
  totalRatings: number;
}

interface PatientProfile {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  emergencyContact: string | null;
  allergies: string[];
  currentMedications: string[];
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    specialty: '',
    bio: '',
    consultationFee: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      if (session?.user?.role === 'DOCTOR') {
        // Fetch doctor profile
        const response = await fetch(`http://localhost:4000/api/doctors/user/${session?.user?.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setDoctorProfile(data);
          // Initialize edit form with current values
          if (data) {
            setEditForm({
              name: data.name || '',
              specialty: data.specialty || '',
              bio: data.bio || '',
              consultationFee: data.consultationFee?.toString() || '',
            });
          }
        } else if (response.status === 404) {
          setDoctorProfile(null);
        }
      } else if (session?.user?.role === 'PATIENT') {
        // Fetch patient profile
        const response = await fetch(`http://localhost:4000/api/patients/user/${session?.user?.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setPatientProfile(data);
        } else if (response.status === 404) {
          setPatientProfile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // Create payload with only non-empty fields
    const payload: any = {};
    
    if (editForm.name && editForm.name !== doctorProfile?.name) {
      payload.name = editForm.name;
    }
    if (editForm.specialty && editForm.specialty !== doctorProfile?.specialty) {
      payload.specialty = editForm.specialty;
    }
    if (editForm.bio !== doctorProfile?.bio) {
      payload.bio = editForm.bio;
    }
    if (editForm.consultationFee && parseInt(editForm.consultationFee) !== doctorProfile?.consultationFee) {
      payload.consultationFee = parseInt(editForm.consultationFee);
    }
    
    console.log('Sending payload:', payload);
    
    const response = await fetch(`http://localhost:4000/api/doctors/${doctorProfile?.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Response:', data);

    if (!response.ok) {
      throw new Error(data.message || data.errors?.message || 'Failed to update profile');
    }

    setDoctorProfile(data);
    setIsEditing(false);
    toast.success('Profile updated successfully!');
    await update({ name: editForm.name });
  } catch (error: any) {
    console.error('Update error:', error);
    toast.error(error.message || 'Failed to update profile');
  }
};

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'PENDING_VERIFICATION':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'REJECTED':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  const getVerificationStatusText = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'Verified';
      case 'PENDING_VERIFICATION':
        return 'Under Review';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Documents Pending';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // ==================== PATIENT PROFILE VIEW ====================
  if (session?.user?.role === 'PATIENT') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <button
            onClick={() => router.push('/dashboard/profile/edit')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Edit Profile
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{patientProfile?.name || session?.user?.name}</h2>
                <p className="text-gray-500 text-sm">{session?.user?.email}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 py-2 border-b border-gray-100">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{session?.user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-2 border-b border-gray-100">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900">Patient</p>
              </div>
            </div>
            
            {patientProfile?.dateOfBirth && (
              <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium text-gray-900">{new Date(patientProfile.dateOfBirth).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            
            {patientProfile?.bloodGroup && (
              <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                <BookOpen className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Blood Group</p>
                  <p className="font-medium text-gray-900">{patientProfile.bloodGroup}</p>
                </div>
              </div>
            )}
            
            {patientProfile?.emergencyContact && (
              <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Emergency Contact</p>
                  <p className="font-medium text-gray-900">{patientProfile.emergencyContact}</p>
                </div>
              </div>
            )}
            
            {patientProfile?.allergies && patientProfile.allergies.length > 0 && (
              <div className="flex items-start gap-3 py-2">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Allergies</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {patientProfile.allergies.map((allergy, idx) => (
                      <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== DOCTOR PROFILE VIEW ====================
  if (!doctorProfile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Doctor Profile</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Profile Incomplete</h2>
          <p className="text-yellow-700 mb-6">Please complete your doctor profile to start practicing</p>
          <a
            href="/dashboard/onboarding"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Complete Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Doctor Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Edit Profile
          </button>
        )}
      </div>
      
      {isEditing ? (
        // Edit Form
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <input
                type="text"
                value={editForm.specialty}
                onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={4}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹)</label>
              <input
                type="number"
                value={editForm.consultationFee}
                onChange={(e) => setEditForm({ ...editForm, consultationFee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    name: doctorProfile.name || '',
                    specialty: doctorProfile.specialty || '',
                    bio: doctorProfile.bio || '',
                    consultationFee: doctorProfile.consultationFee?.toString() || '',
                  });
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        // View Mode
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{doctorProfile.name}</h2>
                <p className="text-blue-600 text-sm">{doctorProfile.specialty}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 py-2 border-b border-gray-100">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{session?.user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-2 border-b border-gray-100">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Consultation Fee</p>
                <p className="font-medium text-gray-900">
                  {doctorProfile.consultationFee ? `₹${doctorProfile.consultationFee}` : 'Not set'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-2 border-b border-gray-100">
              {getVerificationStatusIcon(doctorProfile.verificationStatus)}
              <div>
                <p className="text-sm text-gray-500">Verification Status</p>
                <p className="font-medium text-gray-900">
                  {getVerificationStatusText(doctorProfile.verificationStatus)}
                </p>
              </div>
            </div>
            
            {doctorProfile.averageRating && (
              <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="font-medium text-gray-900">
                    {doctorProfile.averageRating.toFixed(1)} / 5 ({doctorProfile.totalRatings} reviews)
                  </p>
                </div>
              </div>
            )}
            
            {doctorProfile.bio && (
              <div className="flex items-start gap-3 py-2">
                <BookOpen className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Bio</p>
                  <p className="text-gray-700 mt-1">{doctorProfile.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {doctorProfile.verificationStatus === 'PENDING_DOCUMENTS' && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Next Steps</h3>
          <p className="text-blue-700 text-sm mb-3">
            To get verified, please submit your license and degree documents.
          </p>
          <a
            href="/dashboard/documents"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
          >
            Upload Documents →
          </a>
        </div>
      )}
      
      {doctorProfile.verificationStatus === 'PENDING_VERIFICATION' && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Under Review</h3>
          <p className="text-yellow-700 text-sm">
            Your documents are being reviewed by our team. This usually takes 1-2 business days.
          </p>
        </div>
      )}
    </div>
  );
}