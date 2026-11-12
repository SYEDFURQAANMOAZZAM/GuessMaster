import { Server, Socket } from 'socket.io';
import { gameManager, roomManager } from '../classes/managers';
import { WORDS } from '../words';


const getWordOptions = () =>
  [...WORDS].sort(() => Math.random() - 0.5).slice(0, 3);

export const registerGameHandlers = (io: Server, socket: Socket) => {
  const startNextRound = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    const game = gameManager.getGame(roomId);

    if (!room || !game || game.phase === 'finished') return;

    const drawer = gameManager.getNextDrawer(game);

    if (!drawer) {
      finishGame(roomId);
      return;
    }

    const options = getWordOptions();
    game.startRound(drawer.socketId, options);

    io.to(roomId).emit('game:roundStarting', {
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      drawerId: drawer.socketId,
      drawerName: drawer.username,
    });

    // Only drawer receives the word options.
    io.to(drawer.socketId).emit('game:wordOptions', { options });
  };

  const finishGame = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    const game = gameManager.getGame(roomId);

    if (!room || !game) return;

    game.finishGame();
    room.endGame();

    const leaderboard = [...room.players.values()].sort(
      (a, b) => b.score - a.score
    );

    io.to(roomId).emit('game:finished', {
      leaderboard,
      winner: leaderboard[0] ?? null,
    });
  };

  const endRound = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    const game = gameManager.getGame(roomId);

    if (!room || !game || game.phase !== 'playing') return;

    game.endRound();

    io.to(roomId).emit('game:roundEnded', {
      word: game.currentWord,
      currentRound: game.currentRound,
      scores: [...room.players.values()],
    });

    if (game.currentRound >= game.totalRounds) {
      finishGame(roomId);
      return;
    }

    setTimeout(() => startNextRound(roomId), 3000);
  };

  socket.on('game:start', ({ roomId }) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) throw new Error('Room not found');

      const game = gameManager.createGame(room, socket.id);

      io.to(roomId).emit('game:started', {
        currentRound: 0,
        totalRounds: game.totalRounds,
        phase: game.phase,
      });

      startNextRound(roomId);
    } catch (error) {
      socket.emit('error:message', {
        message: error instanceof Error ? error.message : 'Failed to start game',
      });
    }
  });

  socket.on('word:choose', ({ roomId, word }) => {
    const game = gameManager.getGame(roomId);

    if (!game || socket.id !== game.currentDrawerId) return;
    if (!game.selectWord(word)) return;

    io.to(roomId).emit('game:wordSelected', {
      drawerId: game.currentDrawerId,
      timer: 60,
    });

    // Send actual word privately to drawer.
    socket.emit('game:yourWord', { word });

    game.startTimer(
      60,
      (timer) => io.to(roomId).emit('game:timer', { timer }),
      () => endRound(roomId)
    );
  });

  socket.on('game:guess', ({ roomId, guess }) => {
    const room = roomManager.getRoom(roomId);
    const game = gameManager.getGame(roomId);

    if (
      !room ||
      !game ||
      game.phase !== 'playing' ||
      !game.currentWord ||
      !socket.data.roomId ||
      socket.data.roomId !== roomId
    ) return;

    if (socket.id === game.currentDrawerId) return;
    if (game.guessedPlayers.has(socket.id)) return;

    const player = room.getPlayer(socket.id);
    if (!player || !guess?.trim()) return;

    if (guess.trim().toLowerCase() === game.currentWord.toLowerCase()) {
      game.guessedPlayers.add(socket.id);

      player.addScore(10);
      room.getPlayer(game.currentDrawerId!)?.addScore(5);

      io.to(roomId).emit('game:correctGuess', {
        playerName: player.username,
        socketId: player.socketId,
      });

      io.to(roomId).emit('game:scoresUpdated', {
        players: [...room.players.values()],
      });

      const guessers = [...room.players.values()].filter(
        (p) => p.socketId !== game.currentDrawerId
      );

      if (game.guessedPlayers.size >= guessers.length) {
        endRound(roomId);
      }
    } else {
      socket.to(roomId).emit('game:guessReceived', {
        playerName: player.username,
        guess: guess.trim(),
      });
    }
  });

  socket.on('game:endRound', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);

    if (!room || !room.isHost(socket.id)) {
      socket.emit('error:message', {
        message: 'Only the host can end the round',
      });
      return;
    }

    endRound(roomId);
  });
};