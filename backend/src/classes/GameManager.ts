import { Game } from './Game';
import { Room } from './Room';

export class GameManager {
  private games: Map<string, Game> = new Map();

  createGame(room: Room, requesterId: string): Game {
  if (!room.isHost(requesterId)) {
    throw new Error('Only the host can start the game');
  }

  if (room.game) {
    throw new Error('Game already exists in this room');
  }

  room.resetScores();

  const game = room.startGame(requesterId);
  this.games.set(room.id, game);

  return game;
}

  getGame(roomId: string): Game | undefined {
    return this.games.get(roomId);
  }

  removeGame(roomId: string): void {
    const game = this.games.get(roomId);

    game?.stopTimer();

    this.games.delete(roomId);
  }

  getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  getNextDrawer(game: Game) {
  const players = [...game.players.values()];
  if (!players.length) return undefined;

  const index = players.findIndex(
    (player) => player.socketId === game.currentDrawerId
  );

  return players[(index + 1) % players.length];
}
}