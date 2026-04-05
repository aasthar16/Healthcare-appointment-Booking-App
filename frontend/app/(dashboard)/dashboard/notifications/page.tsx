'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchNotifications();
    fetchUnreadCount();
  }, [session, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/notifications?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/notifications/unread/count', {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const data = await response.json();
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('http://localhost:4000/api/notifications/read/all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setNotifications(notifications.filter(n => n.id !== id));
      setTotal(prev => prev - 1);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const deleteAllRead = async () => {
    try {
      await fetch('http://localhost:4000/api/notifications/read/all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setNotifications(notifications.filter(n => !n.isRead));
      toast.success('All read notifications deleted');
    } catch (error) {
      toast.error('Failed to delete read notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_CONFIRMED': return '✅';
      case 'APPOINTMENT_CANCELLED': return '❌';
      case 'APPOINTMENT_REMINDER': return '⏰';
      case 'APPOINTMENT_RESCHEDULED': return '📅';
      case 'MESSAGE_RECEIVED': return '💬';
      case 'RATING_REQUEST': return '⭐';
      case 'PAYMENT_RECEIVED': return '💰';
      case 'PAYMENT_FAILED': return '⚠️';
      case 'DOCTOR_RESPONSE': return '👨‍⚕️';
      default: return '📢';
    }
  };

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} notification{total !== 1 ? 's' : ''} • {unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
          {notifications.some(n => n.isRead) && (
            <button
              onClick={deleteAllRead}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" /> Clear read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">When you receive notifications, they will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notif.isRead ? 'bg-blue-50' : ''
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                      <p className="font-semibold text-gray-900">{notif.title}</p>
                      {!notif.isRead && (
                        <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">New</span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{notif.message}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(notif.createdAt), 'MMMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="text-gray-400 hover:text-red-600 ml-2 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 py-1 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}