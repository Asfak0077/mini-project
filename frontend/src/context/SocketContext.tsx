import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Extract only stable primitives — avoids object-reference churn that causes reconnect loops
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.user?.id);
  const studentId = useAuthStore((s) => s.user?.studentId);
  const teacherId = useAuthStore((s) => s.user?.teacherId);

  // Use a ref so the connect handler always has the latest IDs without re-running the effect
  const roomRef = useRef({ userId, studentId, teacherId, role });
  useEffect(() => {
    roomRef.current = { userId, studentId, teacherId, role };
  }, [userId, studentId, teacherId, role]);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setSocket(null);
        setConnected(false);
      });
      return;
    }

    // Disable Socket.IO on Vercel (serverless) — no persistent WebSocket support
    const isVercel = import.meta.env.VITE_VERCEL === 'true';
    if (isVercel) {
      setConnected(false);
      return;
    }

    const socketUrl = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');

      const { userId: uid, studentId: sid, teacherId: tid, role: r } = roomRef.current;

      const roomIds = Array.from(new Set([uid, sid, tid].filter(Boolean)));
      roomIds.forEach((roomId) => newSocket.emit('join', roomId));

      if (r) newSocket.emit('join_role', r);
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connect error (backend may be offline):', err.message);
    });

    queueMicrotask(() => {
      setSocket(newSocket);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const value = React.useMemo(() => ({ socket, connected }), [socket, connected]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
