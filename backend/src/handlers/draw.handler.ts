import { Server, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { Stroke, DrawingTool, Point } from '../classes/Stroke';
import { gameManager } from '../classes/managers';

export const registerDrawHandlers = (io: Server, socket: Socket) => {
  const getDrawerGame = (roomId: string) => {
    const game = gameManager.getGame(roomId);

    if (
      !game ||
      game.phase !== 'playing' ||
      !game.currentWord ||
      game.currentDrawerId !== socket.id ||
      socket.data.roomId !== roomId
    ) {
      return undefined;
    }

    return game;
  };

  socket.on('draw:stroke', (data) => {
    const game = getDrawerGame(data.roomId);
    if (!game) return;

    if (!Array.isArray(data.points) || data.points.length === 0) return;

    const stroke = new Stroke(
      randomUUID(),
      socket.id,
      data.points as Point[],
      data.color,
      data.width,
      (data.tool ?? 'pen') as DrawingTool
    );

    game.addStroke(stroke);
    io.to(data.roomId).emit('draw:strokeReceived', stroke);
  });

  socket.on('draw:undo', ({ roomId }) => {
    const game = getDrawerGame(roomId);
    if (!game) return;

    const stroke = game.undoStroke();

    if (stroke) {
      io.to(roomId).emit('draw:undoReceived', {
        strokeId: stroke.id,
      });
    }
  });

  socket.on('draw:redo', ({ roomId }) => {
    const game = getDrawerGame(roomId);
    if (!game) return;

    const stroke = game.redoStroke();

    if (stroke) {
      io.to(roomId).emit('draw:redoReceived', stroke);
    }
  });

  socket.on('draw:clear', ({ roomId }) => {
    const game = getDrawerGame(roomId);
    if (!game) return;

    game.clearStrokes();
    io.to(roomId).emit('draw:cleared');
  });
};