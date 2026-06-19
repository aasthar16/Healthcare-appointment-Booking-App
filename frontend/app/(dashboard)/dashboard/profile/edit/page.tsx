'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  ArrowLeft,
  Calendar,
  Phone,
  FileText,
  Plus,
  X,
  Upload,
  Heart,
  Pill,
  AlertCircle,
  MapPin,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== TYPES ====================
interface MediaFile {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  file?: File;
  preview?: string;
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
export default function EditProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newFiles, setNewFiles] = useState<MediaFile[]>([]);
  const [deletingMedia, setDeletingMedia] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: '',
    dateOfBirth: '',
    bloodGroup: '',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    allergies: '',
    currentMedications: '',
    address: '',
    height: '',
    weight: '',
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'PATIENT') {
      router.push('/dashboard/profile');
      return;
    }

    fetchProfile();
  }, [session, status, router]);

  // ==================== FETCH PROFILE ====================
  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/patients/user/${session?.user?.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        }
      });
      
      if (response.ok) {
        // ✅ Profile exists - load the data
        const data = await response.json();
        setPatientProfile(data);
        setEditForm({
          name: data.name || '',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          bloodGroup: data.bloodGroup || '',
          emergencyContact: data.emergencyContact || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactRelation: data.emergencyContactRelation || '',
          allergies: data.allergies?.join(', ') || '',
          currentMedications: data.currentMedications?.join(', ') || '',
          address: data.address || '',
          height: data.height?.toString() || '',
          weight: data.weight?.toString() || '',
        });
      } else if (response.status === 404) {
        // ✅ Profile doesn't exist - this is FINE for new users
        // Just show empty form, don't show error toast
        console.log('No profile found - user can create one');
        setPatientProfile(null);
        // Keep the form empty for new profile creation
      } else {
        // Other errors (500, etc.)
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Don't show toast for network errors - let user try again
    } finally {
      setLoading(false);
    }
  };

  // ==================== MEDIA UPLOAD HANDLERS ====================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMediaFiles: MediaFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      newMediaFiles.push({
        id: `temp-${Date.now()}-${i}`,
        fileName: file.name,
        mimeType: file.type,
        fileUrl: '',
        uploadedAt: new Date().toISOString(),
        file: file,
        preview: URL.createObjectURL(file)
      });
    }

    if (newMediaFiles.length > 0) {
      setNewFiles([...newFiles, ...newMediaFiles]);
      toast.success(`${newMediaFiles.length} file(s) selected`);
    }
    
    e.target.value = '';
  };

  const removeNewFile = (index: number) => {
    const file = newFiles[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (newFiles.length === 0) {
      toast.info('No files to upload');
      return;
    }

    if (!patientProfile?.id) {
      toast.error('Please save your profile first before uploading files');
      return;
    }

    setUploadingFiles(true);
    const formData = new FormData();
    
    newFiles.forEach((file) => {
      if (file.file) {
        formData.append('files', file.file);
      }
    });

    try {
      const response = await fetch(`${API_BASE}/patients/${patientProfile.id}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        const uploaded = await response.json();
        toast.success(`Uploaded ${uploaded.length} file(s)`);
        setNewFiles([]);
        fetchProfile();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  // ==================== DELETE MEDIA ====================
  const deleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    setDeletingMedia(mediaId);
    
    try {
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
        const error = await response.json();
        toast.error(error.message || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeletingMedia(null);
    }
  };

  // ==================== FORM SUBMIT ====================
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  setSubmitting(true);

  try {
    const payload: any = {};
    
    // Collect all form data
    if (editForm.name) payload.name = editForm.name;
    if (editForm.dateOfBirth) payload.dateOfBirth = new Date(editForm.dateOfBirth).toISOString();
    if (editForm.bloodGroup) payload.bloodGroup = editForm.bloodGroup;
    if (editForm.emergencyContact) payload.emergencyContact = editForm.emergencyContact;
    if (editForm.emergencyContactName) payload.emergencyContactName = editForm.emergencyContactName;
    if (editForm.emergencyContactRelation) payload.emergencyContactRelation = editForm.emergencyContactRelation;
    if (editForm.address) payload.address = editForm.address;
    if (editForm.height) payload.height = parseInt(editForm.height);
    if (editForm.weight) payload.weight = parseInt(editForm.weight);
    if (editForm.allergies) {
      payload.allergies = editForm.allergies.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (editForm.currentMedications) {
      payload.currentMedications = editForm.currentMedications.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Validate required fields
    if (!payload.name) {
      toast.error('Please enter your name');
      setSubmitting(false);
      return;
    }

    // ✅ CORRECT: Use PATCH method (not POST)
    const response = await fetch(`${API_BASE}/patients/update`, {
      method: 'PATCH',  // ✅ Changed from 'POST' to 'PATCH'
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

    setPatientProfile(data);
    toast.success('Profile updated successfully!');
    await update({ name: editForm.name });
    router.push('/dashboard/profile');
  } catch (error: any) {
    console.error('Submit error:', error);
    toast.error(error.message || 'Failed to update profile');
  } finally {
    setSubmitting(false);
  }
};


  // ==================== RENDER ====================
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session?.user?.role !== 'PATIENT') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard/profile')}
          className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {patientProfile?.id ? 'Edit Profile' : 'Create Profile'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select
                value={editForm.bloodGroup}
                onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
              <input
                type="number"
                value={editForm.height}
                onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 175"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={editForm.weight}
                onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 70"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Number</label>
              <input
                type="text"
                value={editForm.emergencyContact}
                onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={editForm.emergencyContactName}
                onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name of contact"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
              <input
                type="text"
                value={editForm.emergencyContactRelation}
                onChange={(e) => setEditForm({ ...editForm, emergencyContactRelation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Spouse, Parent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              rows={2}
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your home address"
            />
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Medical Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (comma separated)</label>
            <input
              type="text"
              value={editForm.allergies}
              onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Penicillin, Peanuts, Dairy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications (comma separated)</label>
            <input
              type="text"
              value={editForm.currentMedications}
              onChange={(e) => setEditForm({ ...editForm, currentMedications: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
            />
          </div>
        </div>

        {/* Media Upload (only show if profile exists) */}
        {patientProfile?.id && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Media & Documents</h2>
                <p className="text-sm text-gray-500">Upload medical reports, prescriptions, and images</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Files
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {newFiles.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Upload ({newFiles.length} files)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {newFiles.map((file, index) => {
                    const isImage = file.mimeType?.startsWith('image/');
                    return (
                      <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        {isImage && file.preview ? (
                          <div className="relative h-28 bg-gray-100">
                            <img
                              src={file.preview}
                              alt={file.fileName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-28 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-gray-600 truncate">{file.fileName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewFile(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={uploadFiles}
                    disabled={uploadingFiles}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingFiles ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload All ({newFiles.length})
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      newFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
                      setNewFiles([]);
                    }}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Existing Media Gallery */}
            {patientProfile.ehrDocuments && patientProfile.ehrDocuments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files ({patientProfile.ehrDocuments.length})</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {patientProfile.ehrDocuments.map((media) => {
                    const isImage = media.mimeType?.startsWith('image/');
                    return (
                      <div key={media.id} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        {isImage ? (
                          <div className="relative h-28 bg-gray-100">
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
                          <div className="h-28 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-gray-600 truncate">{media.fileName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMedia(media.id)}
                          disabled={deletingMedia === media.id}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                          {deletingMedia === media.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!patientProfile?.id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-sm">
              💡 Fill in your details and click "Save" to create your profile. 
              After creating your profile, you'll be able to upload documents.
            </p>
          </div>
        )}

        {/* Form Actions */}
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
              patientProfile?.id ? 'Update Profile' : 'Create Profile'
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
  );
}