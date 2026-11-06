import { Player } from './Player';
import { Game } from './Game';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export class Room {
  id: string;
  hostId: string;
  players: Map<string, Player>;
  game: Game | null;

  maxPlayers: number;
  totalRounds: number;
  status: RoomStatus;

  constructor(
    id: string,
    hostId: string,
    maxPlayers = 8,
    totalRounds = 5
  ) {
    this.id = id;
    this.hostId = hostId;
    this.players = new Map();

    this.maxPlayers = maxPlayers;
    this.totalRounds = totalRounds;

    this.status = 'waiting';
    this.game = null;
  }

  addPlayer(player: Player): void {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('Room is full');
    }

    this.players.set(player.socketId, player);
  }

  resetScores(): void {
  this.players.forEach((player) => player.resetScore());
}

  removePlayer(socketId: string): void {
    const player = this.players.get(socketId);

    if (!player) return;

    this.players.delete(socketId);

    if (this.hostId === socketId) {
      const nextHost = this.players.values().next().value;

      if (nextHost) {
        this.hostId = nextHost.socketId;
        nextHost.isHost = true;
      }
    }
  }

  getPlayer(socketId: string): Player | undefined {
    return this.players.get(socketId);
  }

  isHost(socketId: string): boolean {
    return this.hostId === socketId;
  }

  startGame(requesterId: string): Game {
  if (!this.isHost(requesterId)) {
    throw new Error('Only the host can start the game');
  }

  if (this.players.size < 2) {
    throw new Error('At least 2 players are required');
  }

  if (this.game) {
    throw new Error('Game already exists in this room');
  }

  this.game = new Game(this.id, this.totalRounds);
  this.game.players = this.players;
  this.status = 'playing';

  return this.game;
}

  endGame(): void {
    this.game?.stopTimer();
    this.status = 'finished';
  }
  
  kickPlayer(requesterId: string, targetId: string): Player {
  if (!this.isHost(requesterId)) {
    throw new Error('Only the host can kick players');
  }

  if (requesterId === targetId) {
    throw new Error('Host cannot kick themselves');
  }

  const player = this.players.get(targetId);

  if (!player) {
    throw new Error('Player not found');
  }

  this.removePlayer(targetId);

  return player;
}
}