'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { socket } from '@/lib/socket/socket';
import { useSocket } from '@/lib/hooks/useSocket';
import type { Player, RoomStatus } from '@/lib/types/game';

import GameCanvas from '@/components/GameCanvas';
import PlayerList from '@/components/PlayerList';
import ChatBox from '@/components/ChatBox';
import GameHeader from '@/components/GameHeader';

type GamePhase = 'waiting' | 'playing' | 'finished';

type RoomUpdate = {
  roomId: string;
  players: Player[];
  hostId: string;
  maxPlayers: number;
  totalRounds: number;
  status: RoomStatus;
};

type RoundStartingPayload = {
  currentRound: number;
  totalRounds: number;
  drawerId: string;
  drawerName: string;
};

type RoundEndedPayload = {
  word: string | null;
  currentRound: number;
  scores: Player[];
};

type GameFinishedPayload = {
  leaderboard: Player[];
  winner: Player | null;
};

function RoomContent() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socketId } = useSocket();

  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState('');

  const [totalRounds, setTotalRounds] = useState(5);
  const [round, setRound] = useState(0);

  const [timer, setTimer] = useState(60);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('waiting');
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerName, setDrawerName] = useState('');

  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [myWord, setMyWord] = useState('');
  const [wordSelected, setWordSelected] = useState(false);

  const [guess, setGuess] = useState('');
  const [correctGuessers, setCorrectGuessers] = useState<string[]>([]);

  const [roundResult, setRoundResult] = useState<RoundEndedPayload | null>(
    null
  );

  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleRoomUpdate = (room: RoomUpdate) => {
      if (room.roomId !== roomId) return;

      setPlayers(room.players);
      setHostId(room.hostId);
      setTotalRounds(room.totalRounds);
      setRoomStatus(room.status);
    };

    const handleGameStarted = (game: {
      currentRound: number;
      totalRounds: number;
      phase: GamePhase;
    }) => {
      setRound(game.currentRound);
      setTotalRounds(game.totalRounds);
      setRoomStatus('playing');
      setGamePhase(game.phase);
      setErrorMessage('');
    };

    const handleRoundStarting = (data: RoundStartingPayload) => {
      setRound(data.currentRound);
      setTotalRounds(data.totalRounds);

      setDrawerId(data.drawerId);
      setDrawerName(data.drawerName);

      setWordOptions([]);
      setMyWord('');
      setWordSelected(false);

      setGuess('');
      setCorrectGuessers([]);

      setTimer(60);
      setRoundResult(null);
      setGamePhase('playing');
      setRoomStatus('playing');
    };

    const handleWordOptions = ({ options }: { options: string[] }) => {
      setWordOptions(options);
    };

    const handleYourWord = ({ word }: { word: string }) => {
      setMyWord(word);
    };

    const handleWordSelected = ({
      drawerId,
      timer,
    }: {
      drawerId: string;
      timer: number;
    }) => {
      setDrawerId(drawerId);
      setTimer(timer);
      setWordOptions([]);
      setWordSelected(true);
    };

    const handleTimer = ({ timer }: { timer: number }) => {
      setTimer(timer);
    };

    const handleCorrectGuess = ({
      playerName,
      socketId: guesserId,
    }: {
      playerName: string;
      socketId: string;
    }) => {
      setCorrectGuessers((prev) =>
        prev.includes(guesserId) ? prev : [...prev, guesserId]
      );
    };

    const handleScoresUpdated = ({ players }: { players: Player[] }) => {
      setPlayers(players);
    };

    const handleRoundEnded = (data: RoundEndedPayload) => {
      setRoundResult(data);
      setPlayers(data.scores);
      setGamePhase('waiting');
      setWordSelected(false);
      setWordOptions([]);
      setMyWord('');
    };

    const handleGameFinished = ({
      leaderboard,
      winner,
    }: GameFinishedPayload) => {
      setLeaderboard(leaderboard);
      setWinner(winner);
      setRoomStatus('finished');
      setGamePhase('finished');
    };

    const handleError = ({ message }: { message: string }) => {
      setErrorMessage(message);
    };

    const handleRoomClosed = () => {
      setErrorMessage('This room has been closed.');
    };

    const handleKicked = ({ message }: { message: string }) => {
      setErrorMessage(message);
    };

    const syncRoom = () => {
      socket.emit('room:sync', { roomId });
    };

    socket.on('room:updated', handleRoomUpdate);
    socket.on('game:started', handleGameStarted);
    socket.on('game:roundStarting', handleRoundStarting);
    socket.on('game:wordOptions', handleWordOptions);
    socket.on('game:yourWord', handleYourWord);
    socket.on('game:wordSelected', handleWordSelected);
    socket.on('game:timer', handleTimer);
    socket.on('game:correctGuess', handleCorrectGuess);
    socket.on('game:scoresUpdated', handleScoresUpdated);
    socket.on('game:roundEnded', handleRoundEnded);
    socket.on('game:finished', handleGameFinished);
    socket.on('error:message', handleError);
    socket.on('room:closed', handleRoomClosed);
    socket.on('room:kicked', handleKicked);

    if (socket.connected) {
      syncRoom();
    } else {
      socket.once('connect', syncRoom);
      socket.connect();
    }

    return () => {
      socket.off('room:updated', handleRoomUpdate);
      socket.off('game:started', handleGameStarted);
      socket.off('game:roundStarting', handleRoundStarting);
      socket.off('game:wordOptions', handleWordOptions);
      socket.off('game:yourWord', handleYourWord);
      socket.off('game:wordSelected', handleWordSelected);
      socket.off('game:timer', handleTimer);
      socket.off('game:correctGuess', handleCorrectGuess);
      socket.off('game:scoresUpdated', handleScoresUpdated);
      socket.off('game:roundEnded', handleRoundEnded);
      socket.off('game:finished', handleGameFinished);
      socket.off('error:message', handleError);
      socket.off('room:closed', handleRoomClosed);
      socket.off('room:kicked', handleKicked);
      socket.off('connect', syncRoom);
    };
  }, [roomId]);

  const isHost = !!socketId && socketId === hostId;
  const isDrawer = !!socketId && socketId === drawerId;

  const gameStarted = roomStatus === 'playing';
  const canGuess =
    gamePhase === 'playing' &&
    wordSelected &&
    !isDrawer &&
    !!socketId &&
    !correctGuessers.includes(socketId);

  const startGame = () => {
    setErrorMessage('');
    socket.emit('game:start', { roomId });
  };

  const endRound = () => {
    socket.emit('game:endRound', { roomId });
  };

  const chooseWord = (word: string) => {
    socket.emit('word:choose', { roomId, word });
  };

  const submitGuess = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedGuess = guess.trim();
    if (!trimmedGuess || !canGuess) return;

    socket.emit('game:guess', {
      roomId,
      guess: trimmedGuess,
    });

    setGuess('');
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <GameHeader
          roomId={roomId}
          round={round}
          totalRounds={totalRounds}
          timer={timer}
          phase={gamePhase}
          drawerName={drawerName}
          isDrawer={isDrawer}
          myWord={myWord}
        />

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!gameStarted && roomStatus !== 'finished' && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
            <div>
              <p className="text-sm text-slate-600">
                {isHost
                  ? 'You are the host. Ready to start?'
                  : 'Waiting for the host to start the game.'}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Players: {players.length} · Socket: {socketId || 'Disconnected'}
              </p>
            </div>

            {isHost && (
              <button
                onClick={startGame}
                disabled={players.length < 2 || !socket.connected}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Game
              </button>
            )}
          </section>
        )}

        {gameStarted && gamePhase === 'playing' && (
          <section className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {isDrawer
                    ? 'You are drawing!'
                    : `${drawerName || 'The drawer'} is drawing`}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {isDrawer
                    ? 'Choose a word and draw it. Do not reveal the word in chat.'
                    : 'Guess the word before the timer runs out.'}
                </p>
              </div>

              {isHost && (
                <button
                  onClick={endRound}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  End Round
                </button>
              )}
            </div>

            {isDrawer && wordOptions.length > 0 && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold">Choose your word</h2>

                <div className="mt-2 flex flex-wrap gap-2">
                  {wordOptions.map((word) => (
                    <button
                      key={word}
                      onClick={() => chooseWord(word)}
                      className="rounded-lg border border-indigo-200 px-4 py-2 text-sm hover:bg-indigo-50"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canGuess && (
              <form onSubmit={submitGuess} className="mt-4 flex gap-2">
                <input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type your guess..."
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={!guess.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Guess
                </button>
              </form>
            )}

            {isDrawer && myWord && (
              <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
                Your word: <strong>{myWord}</strong>
              </p>
            )}

            {socketId && correctGuessers.includes(socketId) && (
              <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                You guessed correctly! Wait for the next round.
              </p>
            )}
          </section>
        )}

        {roundResult && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="font-semibold text-emerald-800">Round {round} ended</h2>

            <p className="mt-1 text-sm text-emerald-700">
              The word was: <strong>{roundResult.word ?? 'No word selected'}</strong>
            </p>

            <p className="mt-2 text-sm text-emerald-700">
              Next round starts shortly...
            </p>
          </section>
        )}

        {roomStatus === 'finished' && (
          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-xl font-bold">Game finished!</h2>

            {winner && (
              <p className="mt-2 text-lg">
                Winner: <strong>{winner.username}</strong> · {winner.score} points
              </p>
            )}

            <h3 className="mt-4 font-semibold">Final leaderboard</h3>

            <ol className="mt-2 space-y-2">
              {leaderboard.map((player, index) => (
                <li
                  key={player.socketId}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span>
                    {index + 1}. {player.username}
                  </span>
                  <strong>{player.score}</strong>
                </li>
              ))}
            </ol>

            <p className="mt-4 text-sm text-slate-500">
              The current backend does not support restarting the same room after
              the game finishes. Create a new room to play again.
            </p>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-4">
            {gameStarted && (
              <GameCanvas
                roomId={roomId}
                canDraw={isDrawer && wordSelected && gamePhase === 'playing'}
              />
            )}

            <ChatBox roomId={roomId} phase={roomStatus} />
          </div>

          <aside>
            <PlayerList players={players} hostId={hostId} />
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading room...</div>}>
      <RoomContent />
    </Suspense>
  );
}