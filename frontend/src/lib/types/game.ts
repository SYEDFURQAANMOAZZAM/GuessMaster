export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type GamePhase = RoomStatus;
export type DrawingTool = 'pen' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface Player {
  socketId: string;
  username: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
}

export interface Room {
  roomId: string;
  players: Player[];
  hostId: string;
  maxPlayers: number;
  totalRounds: number;
  status: RoomStatus;
}

export interface GameState {
  currentRound: number;
  totalRounds: number;
  phase: GamePhase;
  timer: number;
}

export interface Stroke {
  id: string;
  playerId: string;
  points: Point[];
  color: string;
  width: number;
  tool: DrawingTool;
}

export interface ChatMessage {
  socketId: string;
  playerName: string;
  message: string;
  timestamp: string;
}