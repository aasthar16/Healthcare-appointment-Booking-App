'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, X, Star, DollarSign, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  consultationFee: number | null;
  averageRating: number | null;
  totalRatings: number;
  availability: any[];
}

export default function DoctorSearch() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Search params
  const [searchName, setSearchName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [minFee, setMinFee] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [minRating, setMinRating] = useState('');
  const [availability, setAvailability] = useState('');

  const specialties = [
    'Cardiology', 'Pediatrics', 'Neurology', 'Dermatology',
    'Orthopedics', 'Gynecology', 'Ophthalmology', 'Psychiatry', 'General'
  ];

  useEffect(() => {
    searchDoctors();
  }, []);

  const searchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      if (specialty) params.append('specialty', specialty);
      if (minFee && minFee!='') params.append('minFee', Number(minFee).toString());  // ✅ Convert to number
      if (maxFee && maxFee!='') params.append('maxFee', Number(maxFee).toString());  // ✅ Convert to number
      if (minRating) params.append('minRating', minRating);
      
      console.log('minFee value:', minFee , "type:", typeof minFee);
console.log('maxFee value:', maxFee , "type:", typeof maxFee);
// console.log('Params before append:', params.toString());
      console.log('Sending params:', params.toString());
      
      const response = await fetch(`http://localhost:4000/api/bookings/doctors?${params.toString()}`);
      const data = await response.json();
      
      console.log('Response data:', data);
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setDoctors(data);
      } else {
        console.error('Expected array but got:', data);
        setDoctors([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchDoctors();
  };

  const clearFilters = () => {
    setSearchName('');
    setSpecialty('');
    setMinFee('');
    setMaxFee('');
    setMinRating('');
    setAvailability('');
    setTimeout(() => searchDoctors(), 100);
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400 text-xs">No reviews</span>;
    const fullStars = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < fullStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by doctor name or specialty..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Specialty</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Specialties</option>
                {specialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Fee Range (₹)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minFee}
                  onChange={(e) => setMinFee(e.target.value)}
                  className="w-1/2 px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxFee}
                  onChange={(e) => setMaxFee(e.target.value)}
                  className="w-1/2 px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Rating</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Availability</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Any Time</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This Week</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No doctors found</p>
          <p className="text-sm text-gray-400">Try adjusting your search filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/book-appointment?doctorId=${doctor.id}`)}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                    <p className="text-sm text-blue-600">{doctor.specialty}</p>
                  </div>
                  {renderStars(doctor.averageRating)}
                </div>
                
                {doctor.bio && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{doctor.bio}</p>
                )}
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold">₹{doctor.consultationFee || 500}</span>
                    <span className="text-xs text-gray-500">/ visit</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/book-appointment?doctorId=${doctor.id}`);
                    }}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}