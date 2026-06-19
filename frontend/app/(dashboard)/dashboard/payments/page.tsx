'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  ArrowUpRight,
  FileText
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId: string;
  createdAt: string;
  appointment: {
    id: string;
    scheduledAt: string;
    type: string;
    doctor?: {
      id: string;
      name: string;
      specialty: string;
    };
    patient?: {
      id: string;
      name: string;
    };
  };
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchPayments();
  }, [session, status]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/payments/history`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      } else {
        toast.error('Failed to load payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const isDoctor = session?.user?.role === 'DOCTOR';
  const isPatient = session?.user?.role === 'PATIENT';

  const filteredPayments = payments.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    if (isDoctor) {
      return p.appointment.patient?.name?.toLowerCase().includes(searchLower) ||
             p.providerPaymentId?.toLowerCase().includes(searchLower);
    } else {
      return p.appointment.doctor?.name?.toLowerCase().includes(searchLower) ||
             p.providerPaymentId?.toLowerCase().includes(searchLower);
    }
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.status === 'captured' ? p.amount : 0), 0);
  const completedPayments = filteredPayments.filter(p => p.status === 'captured');
  const pendingPayments = filteredPayments.filter(p => p.status === 'pending');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isDoctor ? 'Payments Received' : 'Payment History'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isDoctor ? 'View all payments from patients' : 'View all your payments for online appointments'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {isDoctor ? 'Total Revenue' : 'Total Spent'}
              </p>
              <p className="text-2xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Successful</p>
              <p className="text-2xl font-bold text-gray-900">{completedPayments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={isDoctor ? "Search by patient name or payment ID..." : "Search by doctor name or payment ID..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No payments yet</h3>
          <p className="text-gray-500">
            {isDoctor 
              ? 'You haven\'t received any payments yet.' 
              : 'You haven\'t made any payments yet. Book an online appointment to get started.'}
          </p>
          {isPatient && (
            <button
              onClick={() => router.push('/dashboard/doctors')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Find a Doctor
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const displayName = isDoctor 
              ? payment.appointment.patient?.name || 'Patient'
              : `Dr. ${payment.appointment.doctor?.name || 'Doctor'}`;
            const displaySpecialty = isDoctor 
              ? null
              : payment.appointment.doctor?.specialty;

            return (
              <div
                key={payment.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{displayName}</h3>
                      {displaySpecialty && (
                        <p className="text-sm text-gray-600">{displaySpecialty}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(payment.appointment.scheduledAt).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {payment.providerPaymentId ? payment.providerPaymentId.slice(0, 8) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      payment.status === 'captured' ? 'bg-green-100 text-green-700' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {payment.status === 'captured' ? '✅ Paid' :
                       payment.status === 'pending' ? '⏳ Pending' :
                       '❌ Failed'}
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      ₹{payment.amount.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}