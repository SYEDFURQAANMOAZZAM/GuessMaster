import { Server, Socket } from 'socket.io';
import { roomManager } from '../classes/managers';

export const registerChatHandlers = (io: Server, socket: Socket) => {
  socket.on('chat:message', ({ roomId, message }) => {
    const room = roomManager.getRoom(roomId);

    if (!room || !room.getPlayer(socket.id)) return;

    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;

    io.to(roomId).emit('chat:messageReceived', {
      socketId: socket.id,
      playerName: socket.data.playerName,
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    });
  });
};