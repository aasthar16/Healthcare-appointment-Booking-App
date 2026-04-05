
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Send, Paperclip, X, FileText, Lock, Clock, Image, File, FileArchive } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  senderRole: string;
  senderId: string;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
}

interface ChatBoxProps {
  appointmentId: string;
  doctorName?: string;
  patientName?: string;
}

export default function ChatBox({ appointmentId, doctorName, patientName }: ChatBoxProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [canChat, setCanChat] = useState(false);
  const [chatStatus, setChatStatus] = useState('');
  const [chatOpensAt, setChatOpensAt] = useState<Date | null>(null);
  const [chatClosesAt, setChatClosesAt] = useState<Date | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userRole = session?.user?.role;

  useEffect(() => {
    if (!session?.accessToken) {
      console.log('No access token available');
      return;
    }

    console.log('Connecting to WebSocket...');

    const newSocket = io('http://localhost:4000/chat', {
      transports: ['websocket', 'polling'],
      auth: {
        token: session.accessToken,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      newSocket.emit('join-chat', { appointmentId });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.log('Connection error:', error.message);
    });

    newSocket.on('chat-status', (data) => {
      console.log('Chat status:', data);
      setCanChat(data.canChat);
      setChatStatus(data.message);
      setChatOpensAt(data.chatOpensAt ? new Date(data.chatOpensAt) : null);
      setChatClosesAt(data.chatClosesAt ? new Date(data.chatClosesAt) : null);
    });

    newSocket.on('previous-messages', (msgs: Message[]) => {
      console.log('Received messages:', msgs.length);
      setMessages(msgs);
    });

    newSocket.on('new-message', (msg: Message) => {
      console.log('New message:', msg);
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('user-typing', (data) => {
      setUserTyping(data.isTyping);
      setTimeout(() => setUserTyping(false), 1000);
    });

    newSocket.on('error', (data) => {
      console.error('Socket error:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [session?.accessToken, appointmentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = (value: boolean) => {
    if (!canChat) return;

    setIsTyping(value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (value) {
      socket?.emit('typing', { appointmentId, isTyping: true });
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('typing', { appointmentId, isTyping: false });
      }, 1000);
    } else {
      socket?.emit('typing', { appointmentId, isTyping: false });
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await fetch('http://localhost:4000/api/chat/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: formData,
      });
      const data = await response.json();

      socket?.emit('send-message', {
        appointmentId,
        content: `Shared a file: ${file.name}`,
        fileUrl: data.fileUrl,
        fileName: file.name,
      });

      setFileToUpload(null);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !fileToUpload) || !canChat) return;

    if (fileToUpload) {
      await uploadFile(fileToUpload);
    }

    if (newMessage.trim()) {
      setSending(true);
      socket?.emit('send-message', {
        appointmentId,
        content: newMessage.trim(),
      });
      setNewMessage('');
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setFileToUpload(file);
    }
  };

  const renderFilePreview = (msg: Message) => {
    const fileName = msg.fileName || 'File';
    const fileUrl = msg.fileUrl;

    if (!fileUrl) return null;

    // Images
    if (fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <img 
          src={fileUrl} 
          alt="Shared" 
          className="max-w-full rounded-lg max-h-48 cursor-pointer" 
          onClick={() => window.open(fileUrl, '_blank')}
        />
      );
    }
    
    // PDF
    if (fileUrl.match(/\.(pdf)$/i)) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
          <FileText className="h-8 w-8 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{fileName}</p>
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-red-600 hover:underline"
            >
              Open PDF
            </a>
          </div>
        </div>
      );
    }
    
    // Word Documents
    if (fileUrl.match(/\.(doc|docx)$/i)) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">{fileName}</p>
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Download Document
            </a>
          </div>
        </div>
      );
    }
    
    // Other files
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
        <File className="h-8 w-8 text-gray-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{fileName}</p>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Download
          </a>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[600px]">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-900">
              {userRole === 'PATIENT' ? `Dr. ${doctorName}` : `Patient: ${patientName}`}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Secure Medical Chat</p>
          </div>
          <div className="text-right">
            {!canChat && chatOpensAt && (
              <div className="flex items-center gap-1 text-xs text-yellow-600">
                <Clock className="h-3 w-3" />
                <span>Opens {format(chatOpensAt, 'MMM d, h:mm a')}</span>
              </div>
            )}
            {canChat && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Lock className="h-3 w-3" />
                <span>Chat Active</span>
              </div>
            )}
          </div>
        </div>
        {chatStatus && (
          <p className={`text-xs mt-2 ${canChat ? 'text-green-600' : 'text-yellow-600'}`}>
            {chatStatus}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No messages yet</p>
            <p className="text-sm mt-1">
              {canChat ? 'Start the conversation' : 'Chat will open before appointment'}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isCurrentUser =
              (msg.senderRole === 'PATIENT' && userRole === 'PATIENT') ||
              (msg.senderRole === 'DOCTOR' && userRole === 'DOCTOR');

            return (
              <div key={msg.id || idx} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isCurrentUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {renderFilePreview(msg)}
                  {msg.content && msg.content !== `Shared a file: ${msg.fileName}` && (
                    <p className="text-sm break-words">{msg.content}</p>
                  )}
                  <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'}`}>
                    {format(new Date(msg.createdAt), 'hh:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {userTyping && (
          <div className="text-left">
            <div className="inline-block bg-gray-100 rounded-lg px-4 py-2">
              <p className="text-sm text-gray-500">Typing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        {fileToUpload && (
          <div className="mb-2 p-2 bg-gray-100 rounded-lg flex justify-between items-center">
            <span className="text-sm truncate">{fileToUpload.name}</span>
            <div className="flex gap-2">
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <button type="submit" className="text-blue-600 text-sm hover:underline">
                  Send File
                </button>
              )}
              <button type="button" onClick={() => setFileToUpload(null)}>
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <label className="cursor-pointer px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={!canChat || uploading} />
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping(true);
            }}
            onBlur={() => handleTyping(false)}
            placeholder={canChat ? 'Type your message...' : chatStatus}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!canChat || sending || uploading}
          />
          <button
            type="submit"
            disabled={!canChat || sending || uploading || (!newMessage.trim() && !fileToUpload)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
