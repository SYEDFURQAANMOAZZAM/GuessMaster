import { Player } from './Player';
import { Stroke } from './Stroke';

export type GamePhase = 'waiting' | 'playing' | 'finished';

export class Game {
  roomId: string;
  players: Map<string, Player>;

  currentRound = 0;
  totalRounds: number;
  currentWord: string | null = null;
  timer = 60;
  phase: GamePhase = 'waiting';

  currentDrawerId: string | null = null;
  wordOptions: string[] = [];
  guessedPlayers = new Set<string>();

  strokes: Stroke[] = [];
  undoneStrokes: Stroke[] = [];
  timerInterval: NodeJS.Timeout | null = null;

  constructor(roomId: string, totalRounds = 5) {
    this.roomId = roomId;
    this.players = new Map();
    this.totalRounds = totalRounds;
  }

  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
    this.undoneStrokes = [];
  }

  undoStroke(): Stroke | undefined {
    const stroke = this.strokes.pop();
    if (stroke) this.undoneStrokes.push(stroke);
    return stroke;
  }

  redoStroke(): Stroke | undefined {
    const stroke = this.undoneStrokes.pop();
    if (stroke) this.strokes.push(stroke);
    return stroke;
  }

  clearStrokes(): void {
    this.strokes = [];
    this.undoneStrokes = [];
  }

  startRound(drawerId: string, options: string[]): void {
    this.stopTimer();

    this.currentRound++;
    this.currentDrawerId = drawerId;
    this.currentWord = null;
    this.wordOptions = options;
    this.guessedPlayers.clear();
    this.timer = 60;
    this.phase = 'playing';
    this.clearStrokes();
  }

  selectWord(word: string): boolean {
    if (!this.wordOptions.includes(word) || this.currentWord) return false;

    this.currentWord = word;
    this.wordOptions = [];
    return true;
  }

  startTimer(
    duration: number,
    onTick?: (remaining: number) => void,
    onComplete?: () => void
  ): void {
    this.stopTimer();
    this.timer = duration;

    this.timerInterval = setInterval(() => {
      this.timer--;
      onTick?.(this.timer);

      if (this.timer <= 0) {
        this.stopTimer();
        onComplete?.();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  endRound(): void {
    this.stopTimer();
    this.phase = 'waiting';
  }

  finishGame(): void {
    this.stopTimer();
    this.phase = 'finished';
    this.currentWord = null;
    this.wordOptions = [];
  }
}