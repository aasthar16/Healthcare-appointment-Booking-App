'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Upload, ArrowLeft } from 'lucide-react';

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [fetchingDoctor, setFetchingDoctor] = useState(true);
  const [formData, setFormData] = useState({
    licenseDocUrl: '',
    degreeDocUrl: '',
  });

  useEffect(() => {
    if (session?.user?.id && session?.user?.role === 'DOCTOR') {
      fetchDoctorId();
    }
  }, [session]);

  const fetchDoctorId = async () => {
    try {
      setFetchingDoctor(true);
      const response = await fetch(`http://localhost:4000/api/doctors/user/${session?.user?.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });
      
      if (response.ok) {
        const doctor = await response.json();
        setDoctorId(doctor.id);
      } else if (response.status === 404) {
        toast.error('Please complete your profile first');
        router.push('/dashboard/onboarding');
        return;
      }
    } catch (error) {
      console.error('Error fetching doctor ID:', error);
      toast.error('Failed to load doctor profile');
    } finally {
      setFetchingDoctor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorId) {
      toast.error('Doctor profile not found. Please complete your profile first.');
      router.push('/dashboard/onboarding');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:4000/api/doctors/${doctorId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          licenseDocUrl: formData.licenseDocUrl,
          degreeDocUrl: formData.degreeDocUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Failed to submit documents');
      }

      toast.success('Documents submitted successfully! Your application is under review.');
      router.push('/dashboard/profile');
    } catch (error: any) {
      console.error('Document submission error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical License Document URL *
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="url"
              required
              value={formData.licenseDocUrl}
              onChange={(e) => setFormData({ ...formData, licenseDocUrl: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/license.pdf"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Provide a URL to your medical license document (PDF or image)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Degree Document URL *
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="url"
              required
              value={formData.degreeDocUrl}
              onChange={(e) => setFormData({ ...formData, degreeDocUrl: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/degree.pdf"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Provide a URL to your medical degree document (PDF or image)</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Please ensure your documents are clear and legible. 
            Submitted documents will be reviewed by our verification team. This process 
            typically takes 1-2 business days.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !doctorId}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
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