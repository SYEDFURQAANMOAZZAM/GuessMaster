import type { GamePhase } from '@/lib/types/game';

interface Props {
  roomId: string;
  round: number;
  totalRounds: number;
  timer: number;
  phase?: GamePhase;
  drawerName?: string;
  isDrawer?: boolean;
  myWord?: string;
}

export default function GameHeader({
  roomId,
  round,
  totalRounds,
  timer,
  phase = 'waiting',
  drawerName,
  isDrawer = false,
  myWord = '',
}: Props) {
  const timerWarning = phase === 'playing' && timer <= 10;

  const inviteFriends = async () => {
    const inviteLink = `${roomId}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Room invite link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy invite link:', error);
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
      <div>
        <h1 className="font-semibold">GuessMaster</h1>
        <p className="text-xs text-slate-500">Room: {roomId}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">
          Round{' '}
          <b className="text-slate-900">
            {round}/{totalRounds}
          </b>
        </span>

        {phase === 'playing' && (
          <span
            className={`rounded-lg px-3 py-2 font-semibold ${
              timerWarning
                ? 'animate-pulse bg-red-100 text-red-700'
                : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {timer}s
          </span>
        )}

        {phase === 'waiting' && (
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-500">
            Waiting
          </span>
        )}

        {phase === 'finished' && (
          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-600">
            Finished
          </span>
        )}

        {phase === 'playing' && drawerName && (
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
            {isDrawer ? 'You are drawing' : `Drawer: ${drawerName}`}
          </span>
        )}

        {/* Invite Friends Button */}
        <button
          onClick={inviteFriends}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
        >
          <span>🔗</span>
          Invite friends
        </button>
      </div>

      {isDrawer && myWord && phase === 'playing' && (
        <div className="w-full rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          Your word: <strong>{myWord}</strong>
        </div>
      )}
    </header>
  );
}