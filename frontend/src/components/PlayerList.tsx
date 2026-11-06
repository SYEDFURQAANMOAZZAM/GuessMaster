'use client';

import { socket } from '@/lib/socket/socket';
import type { Player } from '@/lib/types/game';

interface Props {
  players: Player[];
  hostId: string;
}

export default function PlayerList({ players, hostId }: Props) {
  const isHost = socket.id === hostId;

  const kickPlayer = (targetId: string, username: string) => {
    if (!isHost || targetId === socket.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to kick ${username}?`
    );

    if (!confirmed) return;

    socket.emit('room:kick', { targetId });
  };

  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">Players ({players.length})</h2>

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.socketId}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">
                {player.username}

                {player.socketId === hostId && (
                  <span className="ml-2 text-xs text-indigo-600">
                    Host
                  </span>
                )}
              </p>

              <p className="text-xs text-slate-400">
                {player.isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                {player.score}
              </span>

              {isHost && player.socketId !== socket.id && (
                <button
                  onClick={() =>
                    kickPlayer(player.socketId, player.username)
                  }
                  className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                >
                  Kick
                </button>
              )}
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <p className="text-sm text-slate-400">No players yet.</p>
        )}
      </div>
    </section>
  );
}