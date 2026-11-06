'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket/socket';

export function useSocket() {
  const [connected, setConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState<string | null>(
    socket.id ?? null
  );

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setSocketId(socket.id ?? null);
    };

    const onDisconnect = () => {
      setConnected(false);
      setSocketId(null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { connected, socketId };
}