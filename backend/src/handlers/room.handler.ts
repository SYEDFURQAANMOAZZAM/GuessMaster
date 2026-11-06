import { Server, Socket } from 'socket.io';
import { Player } from '../classes/Player';
import { roomManager } from '../classes/managers';

type RoomPayload = {
  roomId: string;
  playerName?: string;
  username?: string;
  maxPlayers?: number;
  totalRounds?: number;
};

export const registerRoomHandlers = (io: Server, socket: Socket) => {
  // Helpers
  const getPlayerName = (data: RoomPayload) =>
    (data.playerName ?? data.username)?.trim();

  const emitRoomUpdate = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    io.to(roomId).emit('room:updated', {
      roomId: room.id,
      players: Array.from(room.players.values()),
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
      status: room.status,
    });
  };

  const syncGameState = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    const game = room?.game;

    if (!room || !game) return;

    socket.emit('game:started', {
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      phase: game.phase,
    });

    if (game.currentDrawerId) {
      socket.emit('game:roundStarting', {
        currentRound: game.currentRound,
        totalRounds: game.totalRounds,
        drawerId: game.currentDrawerId,
        drawerName: room.getPlayer(game.currentDrawerId)?.username,
      });
    }

    if (game.currentDrawerId === socket.id && game.wordOptions.length) {
      socket.emit('game:wordOptions', {
        options: game.wordOptions,
      });
    }

    if (game.currentWord) {
      socket.emit('game:wordSelected', {
        drawerId: game.currentDrawerId,
        timer: game.timer,
      });

      if (game.currentDrawerId === socket.id) {
        socket.emit('game:yourWord', {
          word: game.currentWord,
        });
      }
    }

    socket.emit('game:timer', { timer: game.timer });
    socket.emit('draw:history', game.strokes);
  };

  const handleError = (error: unknown, fallback: string) => {
    socket.emit('error:message', {
      message: error instanceof Error ? error.message : fallback,
    });
  };

  // CREATE ROOM
  socket.on('room:create', (data: RoomPayload) => {
    try {
      if (socket.data.roomId) {
        throw new Error('You are already in a room');
      }

      const { roomId, maxPlayers, totalRounds } = data;
      const name = getPlayerName(data);

      if (!roomId?.trim() || !name) {
        throw new Error('Room ID and player name are required');
      }

      if (
        maxPlayers !== undefined &&
        (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 20)
      ) {
        throw new Error('Max players must be between 2 and 20');
      }

      if (
        totalRounds !== undefined &&
        (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > 20)
      ) {
        throw new Error('Rounds must be between 1 and 20');
      }

      const host = new Player(socket.id, name, true);

      const room = roomManager.createRoom(
        roomId.trim().toUpperCase(),
        host,
        maxPlayers ?? 8,
        totalRounds ?? 5
      );

      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerName = host.username;

      emitRoomUpdate(room.id);
    } catch (error) {
      handleError(error, 'Failed to create room');
    }
  });

  // JOIN ROOM
  socket.on('room:join', (data: RoomPayload) => {
    try {
      if (socket.data.roomId) {
        throw new Error('Leave your current room first');
      }

      const roomId = data.roomId?.trim().toUpperCase();
      const name = getPlayerName(data);

      if (!roomId || !name) {
        throw new Error('Room ID and player name are required');
      }

      const player = new Player(socket.id, name);
      const room = roomManager.joinRoom(roomId, player);

      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerName = player.username;

      emitRoomUpdate(room.id);
    } catch (error) {
      handleError(error, 'Failed to join room');
    }
  });

  // SYNC ROOM
  socket.on('room:sync', ({ roomId }: { roomId: string }) => {
    try {
      const room = roomManager.getRoom(roomId);

      if (!room) throw new Error('Room not found');

      const player = room.getPlayer(socket.id);

      if (!player) {
        throw new Error('Player not found in room');
      }

      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerName = player.username;

      socket.emit('room:updated', {
        roomId: room.id,
        players: Array.from(room.players.values()),
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        totalRounds: room.totalRounds,
        status: room.status,
      });

      syncGameState(room.id);
    } catch (error) {
      handleError(error, 'Room sync failed');
    }
  });

  // LEAVE ROOM
  socket.on('room:leave', () => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;

    roomManager.leaveRoom(roomId, socket.id);
    socket.leave(roomId);

    delete socket.data.roomId;
    delete socket.data.playerName;

    const room = roomManager.getRoom(roomId);

    if (room) {
      emitRoomUpdate(roomId);
    } else {
      io.to(roomId).emit('room:closed');
    }
  });

  // HOST KICKS PLAYER
  socket.on('room:kick', ({ targetId }: { targetId: string }) => {
    try {
      const roomId = socket.data.roomId as string | undefined;

      if (!roomId) throw new Error('You are not in a room');

      const player = roomManager.kickPlayer(roomId, socket.id, targetId);

      const targetSocket = io.sockets.sockets.get(targetId);

      if (targetSocket) {
        targetSocket.emit('room:kicked', {
          message: 'You were removed by the host',
        });

        targetSocket.leave(roomId);

        delete targetSocket.data.roomId;
        delete targetSocket.data.playerName;
      }

      emitRoomUpdate(roomId);

      // Notify all clients who was removed.
      io.to(roomId).emit('room:playerKicked', {
        playerId: player.socketId,
      });
    } catch (error) {
      handleError(error, 'Failed to kick player');
    }
  });
};