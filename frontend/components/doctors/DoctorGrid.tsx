'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Stethoscope, Star } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  bio?: string;
  consultationFee?: number;
  averageRating?: number | null;
  totalRatings?: number;
}

export default function DoctorGrid() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/bookings/doctors');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setDoctors(data);
      setError(null);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rating stars display function
  const renderStars = (rating: number | null | undefined) => {
    if (!rating || rating === 0) {
      return <span className="text-gray-400 text-xs">No reviews</span>;
    }
    
    const fullStars = Math.floor(rating);
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i < fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <button onClick={fetchDoctors} className="mt-2 text-sm text-red-700 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {doctors.map((doctor) => (
        <div key={doctor.id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">{doctor.name}</h3>
                <p className="text-sm text-blue-600">{doctor.specialty}</p>
              </div>
            </div>
            {renderStars(doctor.averageRating)}
          </div>
          {doctor.bio && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doctor.bio}</p>}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            {doctor.consultationFee && (
              <p className="text-lg font-bold">₹{doctor.consultationFee}</p>
            )}
            <button
              onClick={() => router.push(`/dashboard/book-appointment?doctorId=${doctor.id}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book Appointment
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}