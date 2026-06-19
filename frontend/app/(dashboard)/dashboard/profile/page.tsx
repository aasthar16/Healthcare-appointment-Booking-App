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
  BookOpen,
  Star,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  Trash2,
  Plus,
  Heart,
  Pill,
  AlertCircle,
  MapPin,
  Award,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== TYPES ====================
interface MediaFile {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

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
  experience?: number;
  education?: string[];
  languages?: string[];
  clinicAddress?: string;
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
  ehrDocuments: MediaFile[];
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  address?: string;
  height?: number;
  weight?: number;
}

// ==================== COMPONENT ====================
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'media'>('details');

  // ✅ CORRECT: Use port 4000 directly
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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
        // ✅ CORRECT: Using port 4000
        const response = await fetch(`${API_BASE}/doctors/user/${session?.user?.id}`, {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setDoctorProfile(data);
        } else if (response.status === 404) {
          setDoctorProfile(null);
        } else {
          toast.error('Failed to fetch doctor profile');
        }
      } else if (session?.user?.role === 'PATIENT') {
        // ✅ CORRECT: Using port 4000
        const response = await fetch(`${API_BASE}/patients/user/${session?.user?.id}`, {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPatientProfile(data);
        } else if (response.status === 404) {
          setPatientProfile(null);
        } else {
          toast.error('Failed to fetch patient profile');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      // ✅ CORRECT: Using port 4000
      const response = await fetch(`${API_BASE}/patients/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        }
      });

      if (response.ok) {
        toast.success('File deleted successfully');
        fetchProfile();
      } else {
        toast.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  const getMediaType = (mimeType: string): 'image' | 'document' | 'video' | 'other' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel')) return 'document';
    return 'other';
  };

  const getMediaIcon = (mimeType: string) => {
    const type = getMediaType(mimeType);
    switch (type) {
      case 'image': return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case 'video': return <Video className="h-8 w-8 text-red-500" />;
      case 'document': return <FileText className="h-8 w-8 text-orange-500" />;
      default: return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // ==================== PATIENT PROFILE ====================
  if (session?.user?.role === 'PATIENT') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <button
            onClick={() => router.push('/dashboard/profile/edit')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Edit Profile
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'media'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ImageIcon className="h-4 w-4 inline mr-2" />
            Media & Documents
            {patientProfile?.ehrDocuments && patientProfile.ehrDocuments.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                {patientProfile.ehrDocuments.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'details' ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="font-medium text-gray-900">{formatDate(patientProfile.dateOfBirth)}</p>
                    </div>
                  </div>
                )}
                
                {patientProfile?.bloodGroup && (
                  <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                    <Heart className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-sm text-gray-500">Blood Group</p>
                      <p className="font-medium text-gray-900">{patientProfile.bloodGroup}</p>
                    </div>
                  </div>
                )}
                
                {patientProfile?.height && (
                  <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Height</p>
                      <p className="font-medium text-gray-900">{patientProfile.height} cm</p>
                    </div>
                  </div>
                )}
                
                {patientProfile?.weight && (
                  <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Weight</p>
                      <p className="font-medium text-gray-900">{patientProfile.weight} kg</p>
                    </div>
                  </div>
                )}
                
                {patientProfile?.emergencyContact && (
                  <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Emergency Contact</p>
                      <p className="font-medium text-gray-900">{patientProfile.emergencyContact}</p>
                      {patientProfile.emergencyContactName && (
                        <p className="text-sm text-gray-500">{patientProfile.emergencyContactName}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {patientProfile?.address && (
                  <div className="flex items-start gap-3 py-2 border-b border-gray-100">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium text-gray-900">{patientProfile.address}</p>
                    </div>
                  </div>
                )}
              </div>

              {patientProfile?.allergies && patientProfile.allergies.length > 0 && (
                <div className="flex items-start gap-3 py-2 border-t border-gray-200 pt-4">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
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
              
              {patientProfile?.currentMedications && patientProfile.currentMedications.length > 0 && (
                <div className="flex items-start gap-3 py-2 border-t border-gray-200 pt-4">
                  <Pill className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Current Medications</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {patientProfile.currentMedications.map((med, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Documents & Media</h2>
              <button
                onClick={() => router.push('/dashboard/profile/doctor-edit')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Upload New
              </button>
            </div>
            
            {!patientProfile?.ehrDocuments || patientProfile.ehrDocuments.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-gray-600 font-medium mb-1">No documents uploaded</h3>
                <p className="text-gray-400 text-sm">Upload your medical documents, reports, and images</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {patientProfile.ehrDocuments.map((media) => {
                  const mediaType = getMediaType(media.mimeType);
                  return (
                    <div key={media.id} className="relative group">
                      <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        {mediaType === 'image' ? (
                          <div className="relative h-40 bg-gray-100">
                            <img
                              src={`${API_BASE}${media.fileUrl}`}
                              alt={media.fileName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-40 bg-gray-50 flex flex-col items-center justify-center p-4">
                            {getMediaIcon(media.mimeType)}
                            <span className="mt-2 text-xs text-gray-600 text-center truncate w-full">
                              {media.fileName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {media.fileName.split('.').pop()?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-gray-600 truncate">{media.fileName}</p>
                          <p className="text-xs text-gray-400">{formatDate(media.uploadedAt)}</p>
                        </div>
                      </div>
                      
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`${API_BASE}${media.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white p-1.5 rounded-full shadow-md hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                        </a>
                        <button
                          onClick={() => deleteMedia(media.id)}
                          className="bg-white p-1.5 rounded-full shadow-md hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==================== DOCTOR PROFILE ====================
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Doctor Profile</h1>
        <button
          onClick={() => router.push('/dashboard/profile/doctor-edit')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <User className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {doctorProfile.verificationStatus === 'VERIFIED' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {doctorProfile.verificationStatus === 'PENDING_VERIFICATION' && <Clock className="h-5 w-5 text-yellow-600" />}
              {doctorProfile.verificationStatus === 'REJECTED' && <XCircle className="h-5 w-5 text-red-600" />}
              {doctorProfile.verificationStatus === 'PENDING_DOCUMENTS' && <Clock className="h-5 w-5 text-gray-400" />}
              <div>
                <p className="text-sm text-gray-500">Verification Status</p>
                <p className="font-medium text-gray-900">
                  {doctorProfile.verificationStatus === 'VERIFIED' && 'Verified'}
                  {doctorProfile.verificationStatus === 'PENDING_VERIFICATION' && 'Under Review'}
                  {doctorProfile.verificationStatus === 'REJECTED' && 'Rejected'}
                  {doctorProfile.verificationStatus === 'PENDING_DOCUMENTS' && 'Documents Pending'}
                </p>
              </div>
            </div>
            
            {doctorProfile.experience && (
              <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                <Award className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Experience</p>
                  <p className="font-medium text-gray-900">{doctorProfile.experience} years</p>
                </div>
              </div>
            )}
            
            {doctorProfile.clinicAddress && (
              <div className="flex items-start gap-3 py-2 border-b border-gray-100">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Clinic Address</p>
                  <p className="font-medium text-gray-900">{doctorProfile.clinicAddress}</p>
                </div>
              </div>
            )}
          </div>

          {doctorProfile.bio && (
            <div className="flex items-start gap-3 py-2 border-t border-gray-200 pt-4">
              <BookOpen className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Bio</p>
                <p className="text-gray-700 mt-1">{doctorProfile.bio}</p>
              </div>
            </div>
          )}
          
          {doctorProfile.education && doctorProfile.education.length > 0 && (
            <div className="flex items-start gap-3 py-2 border-t border-gray-200 pt-4">
              <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Education</p>
                <ul className="list-disc list-inside mt-1 text-gray-700">
                  {doctorProfile.education.map((edu, idx) => (
                    <li key={idx}>{edu}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {doctorProfile.averageRating && (
            <div className="flex items-center gap-3 py-2 border-t border-gray-200 pt-4">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="font-medium text-gray-900">
                  {doctorProfile.averageRating.toFixed(1)} / 5 ({doctorProfile.totalRatings} reviews)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
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
    </div>
  );
}