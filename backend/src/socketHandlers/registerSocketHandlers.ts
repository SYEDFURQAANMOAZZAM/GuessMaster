import { Server, Socket } from 'socket.io';

import { registerRoomHandlers } from '../handlers/room.handler';
import { registerGameHandlers } from '../handlers/game.handler';
import { registerDrawHandlers } from '../handlers/draw.handler';
import { registerChatHandlers } from '../handlers/chat.handler';

import { roomManager, gameManager } from '../classes/managers';

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  // Register all event handlers
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerDrawHandlers(io, socket);
  registerChatHandlers(io, socket);

  // Handle unexpected disconnection
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId as string | undefined;

    if (!roomId) return;

    roomManager.leaveRoom(roomId, socket.id);

    const room = roomManager.getRoom(roomId);

    // Delete game if room no longer exists
    if (!room) {
      gameManager.removeGame(roomId);

      io.to(roomId).emit('room:closed');
      return;
    }

    // Notify remaining players and update host
    io.to(roomId).emit('room:updated', {
      roomId: room.id,
      players: Array.from(room.players.values()),
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
      status: room.status,
    });

    io.to(roomId).emit('room:playerLeft', {
      socketId: socket.id,
      playerName: socket.data.playerName,
    });
  });
};