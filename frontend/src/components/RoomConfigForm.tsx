
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket/socket';

export default function RoomConfigForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(5);
  const [pendingRoomId, setPendingRoomId] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [pendingAction, setPendingAction] = useState('');

  useEffect(() => {
    const handleRoomUpdate = (room: { roomId: string }) => {
      if (room.roomId === pendingRoomId) {
        router.push(`/${room.roomId}`);
      }
    };

    const handleError = ({ message }: { message: string }) => {
      setError(message);
      setPendingRoomId('');
      setIsPending(false);
      setPendingAction('');
    };

    socket.on('room:updated', handleRoomUpdate);
    socket.on('error:message', handleError);

    return () => {
      socket.off('room:updated', handleRoomUpdate);
      socket.off('error:message', handleError);
    };
  }, [pendingRoomId, router]);

  const emitWhenConnected = (event: string, data: object) => {
    if (socket.connected) {
      socket.emit(event, data);
    } else {
      socket.once('connect', () => socket.emit(event, data));
      socket.connect();
    }
  };

  const createRoom = () => {
    if (!name.trim()) {
      setError('Enter your nickname');
      return;
    }

    const id = Math.random().toString(36).slice(2, 8).toUpperCase();

    setError('');
    setPendingRoomId(id);
    setPendingAction('Creating your room...');
    setIsPending(true);

    emitWhenConnected('room:create', {
      roomId: id,
      playerName: name.trim(),
      maxPlayers,
      totalRounds: rounds,
    });
  };

  const joinRoom = () => {
    if (!name.trim() || !roomId.trim()) {
      setError('Enter nickname and room code');
      return;
    }

    const id = roomId.trim().toUpperCase();

    setError('');
    setPendingRoomId(id);
    setPendingAction('Joining room...');
    setIsPending(true);

    emitWhenConnected('room:join', {
      roomId: id,
      playerName: name.trim(),
    });
  };

  const input =
    'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100';

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">

      {/* Room Configuration Form */}
      <div
        className={`mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm transition-opacity ${
          isPending ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        <h1 className="text-2xl font-semibold">GuessMaster</h1>

        <p className="mt-1 text-sm text-slate-500">
          Draw, guess, and have fun.
        </p>

        <div className="mt-6 space-y-4">
          <input
            className={input}
            placeholder="Your nickname"
            value={name}
            disabled={isPending}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600">
              Players
              <select
                className={`${input} mt-1`}
                value={maxPlayers}
                disabled={isPending}
                onChange={(e) =>
                  setMaxPlayers(Number(e.target.value))
                }
              >
                {[2, 4, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600">
              Rounds
              <select
                className={`${input} mt-1`}
                value={rounds}
                disabled={isPending}
                onChange={(e) =>
                  setRounds(Number(e.target.value))
                }
              >
                {[3, 5, 7, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={createRoom}
            disabled={isPending}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Room
          </button>

          <div className="text-center text-xs text-slate-400">
            OR JOIN
          </div>

          <input
            className={input}
            placeholder="Room code"
            value={roomId}
            disabled={isPending}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <button
            onClick={joinRoom}
            disabled={isPending}
            className="w-full rounded-lg border py-2.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join Room
          </button>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>

      {/* Full Page Pending Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-2xl bg-white px-10 py-8 shadow-xl">

            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

            <p className="mt-5 text-base font-semibold text-slate-800">
              {pendingAction}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Please wait, this may take a moment.
            </p>

          </div>
        </div>
      )}

    </main>
  );
}
