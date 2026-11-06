'use client';

import { useEffect, useRef, useState } from 'react';
import { socket } from '@/lib/socket/socket';
import type { ChatMessage, GamePhase } from '@/lib/types/game';

interface Props {
  roomId: string;
  phase: GamePhase;
}

export default function ChatBox({ roomId, phase }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMessage = (message: ChatMessage) =>
      setMessages((prev) => [...prev, message]);

    const onGuess = (data: { playerName: string; guess: string }) =>
      setMessages((prev) => [
        ...prev,
        {
          socketId: '',
          playerName: data.playerName,
          message: data.guess,
          timestamp: new Date().toISOString(),
        },
      ]);

    const onCorrect = (data: { playerName: string }) =>
      setMessages((prev) => [
        ...prev,
        {
          socketId: '',
          playerName: 'Game',
          message: `${data.playerName} guessed correctly!`,
          timestamp: new Date().toISOString(),
        },
      ]);

    socket.on('chat:messageReceived', onMessage);
    socket.on('game:guessReceived', onGuess);
    socket.on('game:correctGuess', onCorrect);

    return () => {
      socket.off('chat:messageReceived', onMessage);
      socket.off('game:guessReceived', onGuess);
      socket.off('game:correctGuess', onCorrect);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const message = text.trim();
    if (!message || !socket.connected) return;

    if (phase === 'playing') {
      socket.emit('game:guess', { roomId, guess: message });
    } else {
      socket.emit('chat:message', { roomId, message });
    }

    setText('');
  };

  return (
    <section className="flex h-[360px] flex-col rounded-xl border bg-white">
      <h2 className="border-b p-4 font-semibold">
        {phase === 'playing' ? 'Guesses' : 'Chat'}
      </h2>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <p key={`${msg.timestamp}-${i}`} className="text-sm">
            <b>{msg.playerName}: </b>
            <span className="text-slate-600">{msg.message}</span>
          </p>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={phase === 'playing' ? 'Type your guess...' : 'Type a message...'}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
        />

        <button
          onClick={sendMessage}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
        >
          Send
        </button>
      </div>
    </section>
  );
}