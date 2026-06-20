'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Upload, ArrowLeft, CheckCircle, Clock, XCircle, Trash2, Loader2 } from 'lucide-react';

type VerificationStatus = 'PENDING_DOCUMENTS' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';

interface DoctorProfile {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  bio: string | null;
  consultationFee: number | null;
  verificationStatus: VerificationStatus;
  licenseDocUrl: string | null;
  degreeDocUrl: string | null;
  createdAt: string;
}

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const degreeInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [fetchingDoctor, setFetchingDoctor] = useState(true);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [degreePreview, setDegreePreview] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session?.user?.role === 'DOCTOR') {
      fetchDoctorProfile();
    } else {
      router.push('/dashboard');
    }
  }, [session, status]);

  const fetchDoctorProfile = async () => {
    try {
      setFetchingDoctor(true);
      const token = session?.accessToken ;
      
      const response = await fetch(`${API_BASE}/doctors/user/${session?.user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const doctor = await response.json();
        setDoctorProfile(doctor);
        console.log('Doctor profile loaded:', doctor);
      } else if (response.status === 404) {
        toast.error('Please complete your profile first');
        router.push('/dashboard/onboarding');
        return;
      } else {
        toast.error('Failed to load doctor profile');
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      toast.error('Failed to load doctor profile');
    } finally {
      setFetchingDoctor(false);
    }
  };

  const handleFileSelect = (type: 'license' | 'degree', file: File | null) => {
    if (!file) {
      if (type === 'license') {
        setLicenseFile(null);
        setLicensePreview(null);
      } else {
        setDegreeFile(null);
        setDegreePreview(null);
      }
      return;
    }

    // ✅ Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} is too large. Max size is 10MB.`);
      return;
    }

    // ✅ Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, GIF, WEBP, PDF');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === 'license') {
      setLicenseFile(file);
      setLicensePreview(previewUrl);
    } else {
      setDegreeFile(file);
      setDegreePreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!doctorProfile?.id) {
    toast.error('Doctor profile not found');
    return;
  }

  if (!licenseFile && !degreeFile) {
    toast.error('Please select at least one document to upload');
    return;
  }
  
  setUploading(true);

  try {
    const token = session?.accessToken ;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    
    // ✅ FIX: Use 'license' and 'degree' as field names
    // NOT 'files' with a custom filename
    if (licenseFile) {
      formData.append('license', licenseFile);
    }
    if (degreeFile) {
      formData.append('degree', degreeFile);
    }

    // ✅ Debug: Log what's being sent
    console.log('📤 Uploading documents...');
    console.log('License file:', licenseFile?.name);
    console.log('Degree file:', degreeFile?.name);
    
    // Log FormData contents
    for (let pair of formData.entries()) {
      console.log('FormData entry:', pair[0], pair[1] instanceof File ? pair[1].name : pair[1]);
    }

    const response = await fetch(`${API_BASE}/doctors/documents/upload/${doctorProfile.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // ✅ IMPORTANT: Do NOT set Content-Type header
        // Let the browser set it with the proper boundary
      },
      body: formData,
    });

    const data = await response.json();
    console.log('📥 Upload response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload documents');
    }

    toast.success('Documents uploaded successfully! Your application is under review.');
    
    // ✅ Reset form
    setLicenseFile(null);
    setDegreeFile(null);
    setLicensePreview(null);
    setDegreePreview(null);
    
    // Reset file inputs
    if (licenseInputRef.current) licenseInputRef.current.value = '';
    if (degreeInputRef.current) degreeInputRef.current.value = '';
    
    // ✅ Refresh profile
    await fetchDoctorProfile();
    
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    toast.error(error.message || 'Something went wrong');
  } finally {
    setUploading(false);
  }
};

  const handleDeleteDocument = async (type: 'license' | 'degree') => {
    if (!confirm(`Are you sure you want to delete your ${type} document?`)) return;

    try {
      const token = session?.accessToken ;
      
      const response = await fetch(`${API_BASE}/doctors/${doctorProfile?.id}/documents/${type}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success(`${type} document deleted successfully`);
        fetchDoctorProfile();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  // ==================== STATUS MAP ====================
  const statusMap: Record<VerificationStatus, { icon: JSX.Element; title: string; message: string; color: string }> = {
    'PENDING_DOCUMENTS': {
      icon: <Clock className="h-12 w-12 text-yellow-500" />,
      title: 'Documents Pending',
      message: 'Please submit your license and degree documents for verification.',
      color: 'yellow',
    },
    'PENDING_VERIFICATION': {
      icon: <Clock className="h-12 w-12 text-blue-500" />,
      title: 'Under Review',
      message: 'Your documents are being reviewed. This usually takes 1-2 business days.',
      color: 'blue',
    },
    'VERIFIED': {
      icon: <CheckCircle className="h-12 w-12 text-green-500" />,
      title: 'Verified Doctor',
      message: 'Your account has been verified! You can now accept appointments.',
      color: 'green',
    },
    'REJECTED': {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      title: 'Verification Rejected',
      message: 'Your documents were rejected. Please contact support.',
      color: 'red',
    },
  };

  // ==================== SHOW VERIFICATION STATUS ====================
  if (doctorProfile) {
    const statusKey = doctorProfile.verificationStatus as VerificationStatus;
    const statusInfo = statusMap[statusKey] || statusMap['PENDING_DOCUMENTS'];

    // If NOT pending documents, show status message
    if (doctorProfile.verificationStatus !== 'PENDING_DOCUMENTS') {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className={`bg-${statusInfo.color}-50 border border-${statusInfo.color}-200 rounded-lg p-8 text-center`}>
            <div className="flex justify-center mb-4">
              {statusInfo.icon}
            </div>
            <h2 className={`text-2xl font-bold text-${statusInfo.color}-800 mb-2`}>
              {statusInfo.title}
            </h2>
            <p className={`text-${statusInfo.color}-700 mb-4`}>
              {statusInfo.message}
            </p>
            {doctorProfile.verificationStatus === 'VERIFIED' && (
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Go to Profile
              </button>
            )}
          </div>
        </div>
      );
    }
  }

  if (status === 'loading' || fetchingDoctor) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'DOCTOR') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700">Access denied. This page is only for doctors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-2">Submit Verification Documents</h1>
      <p className="text-gray-600 mb-6">Upload your license and degree certificates for verification</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* License Document */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical License Document *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            {licensePreview ? (
              <div className="space-y-3">
                {licenseFile?.type.startsWith('image/') ? (
                  <img src={licensePreview} alt="License Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                )}
                <p className="text-sm text-gray-600">{licenseFile?.name}</p>
                <button
                  type="button"
                  onClick={() => handleFileSelect('license', null)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Click or drag to upload license</p>
                <p className="text-xs text-gray-400">PDF or Image (JPG, PNG, WEBP) - Max 10MB</p>
                <button
                  type="button"
                  onClick={() => licenseInputRef.current?.click()}
                  className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Select File
                </button>
              </>
            )}
            <input
              ref={licenseInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleFileSelect('license', file);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Degree Document */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Degree Document *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            {degreePreview ? (
              <div className="space-y-3">
                {degreeFile?.type.startsWith('image/') ? (
                  <img src={degreePreview} alt="Degree Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                )}
                <p className="text-sm text-gray-600">{degreeFile?.name}</p>
                <button
                  type="button"
                  onClick={() => handleFileSelect('degree', null)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Click or drag to upload degree</p>
                <p className="text-xs text-gray-400">PDF or Image (JPG, PNG, WEBP) - Max 10MB</p>
                <button
                  type="button"
                  onClick={() => degreeInputRef.current?.click()}
                  className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Select File
                </button>
              </>
            )}
            <input
              ref={degreeInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleFileSelect('degree', file);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Existing Documents */}
        {(doctorProfile?.licenseDocUrl || doctorProfile?.degreeDocUrl) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents</h3>
            <div className="space-y-2">
              {doctorProfile.licenseDocUrl && (
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-500" />
                    <span className="text-sm">License Document</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument('license')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              {doctorProfile.degreeDocUrl && (
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Degree Document</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument('degree')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || (!licenseFile && !degreeFile)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Submit Documents
            </>
          )}
        </button>
      </form>
    </div>
  );
}