export interface Point {
  x: number;
  y: number;
}

export type DrawingTool = 'pen' | 'eraser';

export class Stroke {
  id: string;
  playerId: string;
  points: Point[];
  color: string;
  width: number;
  tool: DrawingTool;

  constructor(
    id: string,
    playerId: string,
    points: Point[],
    color: string,
    width: number,
    tool: DrawingTool = 'pen'
  ) {
    this.id = id;
    this.playerId = playerId;
    this.points = points;
    this.color = color;
    this.width = width;
    this.tool = tool;
  }

  isEraser(): boolean {
    return this.tool === 'eraser';
  }
}