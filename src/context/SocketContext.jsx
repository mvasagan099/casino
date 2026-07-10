import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    // Only connect if the user is authenticated
    const token = localStorage.getItem('accessToken');
    if (!token || !user) return;

    const socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socketInstance.on('users:online', (data) => {
      setOnlineUsers(data.count);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
