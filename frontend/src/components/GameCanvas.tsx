'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { socket } from '@/lib/socket/socket';
import type { Point, Stroke, DrawingTool } from '@/lib/types/game';

interface GameCanvasProps {
  roomId: string;
  canDraw: boolean;
}

export default function GameCanvas({ roomId, canDraw }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState('#111827');
  const [width, setWidth] = useState(5);
  const [tool, setTool] = useState<DrawingTool>('pen');

  const renderStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      if (!stroke.points.length) return;

      ctx.save();

      ctx.globalCompositeOperation =
        stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      stroke.points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });

      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const redraw = useCallback(
    (list: Stroke[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      list.forEach((stroke) => renderStroke(ctx, stroke));
    },
    [renderStroke]
  );

  // Resize canvas and redraw existing strokes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);

      redraw(strokes);
    };

    resize();

    window.addEventListener('resize', resize);

    return () => window.removeEventListener('resize', resize);
  }, [redraw, strokes]);

  // Receive drawing events and history from backend.
  useEffect(() => {
    const receiveStroke = (stroke: Stroke) => {
      setStrokes((prev) => {
        if (prev.some((item) => item.id === stroke.id)) {
          return prev;
        }

        const next = [...prev, stroke];
        redraw(next);

        return next;
      });
    };

    const receiveUndo = ({ strokeId }: { strokeId: string }) => {
      setStrokes((prev) => {
        const next = prev.filter((stroke) => stroke.id !== strokeId);

        redraw(next);

        return next;
      });
    };

    const receiveRedo = (stroke: Stroke) => {
      receiveStroke(stroke);
    };

    const receiveClear = () => {
      setStrokes([]);
      redraw([]);
    };

    const receiveHistory = (history: Stroke[]) => {
      setStrokes(history);
      redraw(history);
    };

    socket.on('draw:strokeReceived', receiveStroke);
    socket.on('draw:undoReceived', receiveUndo);
    socket.on('draw:redoReceived', receiveRedo);
    socket.on('draw:cleared', receiveClear);
    socket.on('draw:history', receiveHistory);

    return () => {
      socket.off('draw:strokeReceived', receiveStroke);
      socket.off('draw:undoReceived', receiveUndo);
      socket.off('draw:redoReceived', receiveRedo);
      socket.off('draw:cleared', receiveClear);
      socket.off('draw:history', receiveHistory);
    };
  }, [redraw]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!socket.connected || !canDraw) return;

    drawingRef.current = true;

    e.currentTarget.setPointerCapture(e.pointerId);
    pointsRef.current = [getPoint(e)];
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !canDraw) return;

    const point = getPoint(e);
    pointsRef.current.push(point);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const previous = pointsRef.current[pointsRef.current.length - 2];

    ctx.save();

    ctx.globalCompositeOperation =
      tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    ctx.restore();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const points = [...pointsRef.current];
    pointsRef.current = [];

    if (!canDraw || !socket.connected || points.length === 0) {
      redraw(strokes);
      return;
    }

    socket.emit('draw:stroke', {
      roomId,
      points,
      color,
      width,
      tool,
    });
  };

  const undo = () => {
    if (canDraw) socket.emit('draw:undo', { roomId });
  };

  const redo = () => {
    if (canDraw) socket.emit('draw:redo', { roomId });
  };

  const clear = () => {
    if (canDraw) socket.emit('draw:clear', { roomId });
  };

  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      {canDraw && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setTool('pen')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              tool === 'pen' ? 'bg-indigo-50 text-indigo-600' : ''
            }`}
          >
            Pen
          </button>

          <button
            onClick={() => setTool('eraser')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              tool === 'eraser' ? 'bg-indigo-50 text-indigo-600' : ''
            }`}
          >
            Eraser
          </button>

          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Drawing color"
          />

          <label className="flex items-center gap-2 text-sm">
            Width
            <input
              type="range"
              min={1}
              max={30}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>

          <button
            onClick={undo}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Undo
          </button>

          <button
            onClick={redo}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Redo
          </button>

          <button
            onClick={clear}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Clear
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        className={`h-[450px] w-full touch-none rounded-lg border ${
          canDraw ? 'cursor-crosshair bg-white' : 'cursor-not-allowed bg-slate-50'
        }`}
      />

      <p className="text-xs text-slate-400">
        {socket.connected ? 'Connected' : 'Disconnected'} · {strokes.length}{' '}
        strokes · {canDraw ? 'You are drawing' : 'Waiting for drawer'}
      </p>
    </section>
  );
}