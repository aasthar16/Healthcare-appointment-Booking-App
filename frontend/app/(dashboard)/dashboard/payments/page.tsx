'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentId: string;
  createdAt: string;
  appointment: {
    id: string;
    scheduledAt: string;
    doctor: {
      name: string;
      specialty: string;
    };
  };
}

export default function PaymentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchPayments();
  }, [session]);

  const fetchPayments = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/payments/history', {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (paymentId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/payments/receipt/${paymentId}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'captured':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'captured':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'created':
        return 'Pending';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-gray-600 mt-1">View all your transaction history</p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No payments yet</h3>
          <p className="text-gray-500">Your payment history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {payment.appointment.doctor.name}
                    </h3>
                    <p className="text-sm text-gray-500">{payment.appointment.doctor.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(payment.status)}
                  <span className="text-sm font-medium">{getStatusText(payment.status)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-semibold text-gray-900">₹{payment.amount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="text-gray-900">{format(new Date(payment.createdAt), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Appointment Date</p>
                  <p className="text-gray-900">{format(new Date(payment.appointment.scheduledAt), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Transaction ID</p>
                  <p className="text-gray-900 text-sm font-mono">{payment.paymentId?.slice(-8) || 'N/A'}</p>
                </div>
              </div>

              {payment.status === 'captured' && (
                <button
                  onClick={() => downloadReceipt(payment.id)}
                  className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Download Receipt
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}