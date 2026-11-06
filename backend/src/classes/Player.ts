export class Player {
  socketId: string;
  username: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;

  constructor(socketId: string, username: string, isHost = false) {
    this.socketId = socketId;
    this.username = username;
    this.score = 0;
    this.isHost = isHost;
    this.isConnected = true;
  }

  addScore(points: number): void {
    this.score += points;
  }

  resetScore(): void {
    this.score = 0;
  }
}