'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Check, CheckCheck, Trash2, X, BellRing, MessageCircle } from 'lucide-react';
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

export default function NotificationBell() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    if (session?.accessToken) {
      fetchNotifications();
      fetchUnreadCount();
      
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        // ✅ Ensure data is an array
        const notificationsArray = Array.isArray(data) ? data : data.notifications || [];
        setNotifications(notificationsArray);
        // Update unread count from the response if available
        if (data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('Notification deleted');
      }
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_CONFIRMED':
        return '✅';
      case 'APPOINTMENT_CANCELLED':
        return '❌';
      case 'APPOINTMENT_REMINDER':
        return '⏰';
      case 'APPOINTMENT_RESCHEDULED':
        return '📅';
      case 'MESSAGE_RECEIVED':
        return <MessageCircle className="h-4 w-4 text-blue-500 inline" />;
      case 'RATING_REQUEST':
        return '⭐';
      case 'PAYMENT_RECEIVED':
        return '💰';
      case 'PAYMENT_FAILED':
        return '⚠️';
      case 'DOCTOR_RESPONSE':
        return '👨‍⚕️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_CONFIRMED':
        return 'bg-green-100 border-green-200';
      case 'APPOINTMENT_CANCELLED':
        return 'bg-red-100 border-red-200';
      case 'APPOINTMENT_REMINDER':
        return 'bg-yellow-100 border-yellow-200';
      case 'MESSAGE_RECEIVED':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  // ✅ Safely check if notifications is an array and has unread items
  const hasUnread = Array.isArray(notifications) && notifications.some(n => !n.isRead);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
            fetchUnreadCount();
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-blue-600 animate-pulse" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[18px] h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] flex flex-col">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white rounded-t-lg flex-shrink-0">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {Array.isArray(notifications) && notifications.some(n => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm mt-2">Loading...</p>
              </div>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notif.isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                        <p className="font-medium text-sm text-gray-900 truncate">{notif.title}</p>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="text-gray-400 hover:text-red-600 ml-2 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-200 text-center flex-shrink-0 bg-gray-50 rounded-b-lg">
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/dashboard/notifications';
              }}
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}