import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token && !socket) {
      const newSocket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });
      
      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      
      setSocket(newSocket);
      
      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [user, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};