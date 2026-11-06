import { Room } from './Room';
import { Player } from './Player';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(
    roomId: string,
    host: Player,
    maxPlayers = 8,
    totalRounds = 5
  ): Room {
    if (this.rooms.has(roomId)) {
      throw new Error('Room already exists');
    }

    const room = new Room(
      roomId,
      host.socketId,
      maxPlayers,
      totalRounds
    );

    room.addPlayer(host);

    this.rooms.set(roomId, room);

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, player: Player): Room {
    const room = this.getRoom(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already started');
    }

    room.addPlayer(player);

    return room;
  }

  leaveRoom(roomId: string, socketId: string): void {
    const room = this.getRoom(roomId);

    if (!room) return;

    room.removePlayer(socketId);

    if (room.players.size === 0) {
      room.game?.stopTimer();
      this.rooms.delete(roomId);
    }
  }

  deleteRoom(roomId: string): void {
    const room = this.getRoom(roomId);

    room?.game?.stopTimer();

    this.rooms.delete(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  kickPlayer(
  roomId: string,
  requesterId: string,
  targetId: string
): Player {
  const room = this.getRoom(roomId);

  if (!room) {
    throw new Error('Room not found');
  }

  return room.kickPlayer(requesterId, targetId);
}
}
   