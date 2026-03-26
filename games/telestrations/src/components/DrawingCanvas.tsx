import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

// ── Public API ─────────────────────────────────────────────────────────────────

export interface DrawingCanvasHandle {
  getDataUrl: () => string;
  clear: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CANVAS_W = 600;
const CANVAS_H = 400;
const MAX_UNDO = 20;

const PALETTE = [
  '#111111', '#555555', '#FFFFFF',
  '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6',
  '#EC4899', '#92400E',
];

const BRUSH_SIZES = [3, 8, 16, 28];

// ── Component ─────────────────────────────────────────────────────────────────

const DrawingCanvas = forwardRef<DrawingCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<ImageData[]>([]);

  const [color, setColor] = useState('#111111');
  const [brushSize, setBrushSize] = useState(8);
  const [eraser, setEraser] = useState(false);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getDataUrl() {
      return canvasRef.current?.toDataURL('image/jpeg', 0.8) ?? '';
    },
    clear() {
      clearCanvas();
    },
  }));

  // Initialize with white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function pushUndo() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const snapshot = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    undoStack.current = [...undoStack.current.slice(-MAX_UNDO + 1), snapshot];
  }

  function undo() {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.current.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    ctx.putImageData(prev, 0, 0);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pushUndo();
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndo();
    isDrawing.current = true;
    const pos = getCanvasPos(e);
    lastPos.current = pos;
    // Draw a dot at the starting point
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (eraser ? brushSize * 1.5 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = eraser ? '#FFFFFF' : color;
    ctx.fill();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !lastPos.current) return;
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    const drawColor = eraser ? '#FFFFFF' : color;
    const size = eraser ? brushSize * 1.5 : brushSize;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }

  function onPointerUp() {
    isDrawing.current = false;
    lastPos.current = null;
  }

  const activeColor = eraser ? '#FFFFFF' : color;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Canvas */}
      <div style={{ border: '2px solid #334155', borderRadius: 6, overflow: 'hidden', lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: '100%', maxWidth: CANVAS_W, height: 'auto', display: 'block', cursor: eraser ? 'cell' : 'crosshair', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {/* Color palette */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); setEraser(false); }}
              style={{
                width: 22, height: 22, borderRadius: '50%', border: 'none',
                background: c,
                outline: (!eraser && color === c) ? '2px solid #E2E8F0' : '2px solid transparent',
                outlineOffset: 1,
                cursor: 'pointer',
                boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px #334155' : undefined,
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: '#334155', flexShrink: 0 }} />

        {/* Brush sizes */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {BRUSH_SIZES.map(sz => (
            <button
              key={sz}
              onClick={() => { setBrushSize(sz); }}
              style={{
                width: 28, height: 28, borderRadius: 4, border: '1px solid #334155',
                background: brushSize === sz ? '#334155' : '#1E293B',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: sz * 0.6, height: sz * 0.6, borderRadius: '50%', background: activeColor, maxWidth: 18, maxHeight: 18, minWidth: 3, minHeight: 3 }} />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: '#334155', flexShrink: 0 }} />

        {/* Eraser */}
        <button
          onClick={() => setEraser(e => !e)}
          style={{
            padding: '4px 10px', borderRadius: 4, border: '1px solid #334155',
            background: eraser ? '#8B5CF6' : '#1E293B', color: '#E2E8F0', fontSize: 12, cursor: 'pointer',
          }}
        >
          ⌫ Eraser
        </button>

        {/* Undo */}
        <button
          onClick={undo}
          style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #334155', background: '#1E293B', color: '#E2E8F0', fontSize: 12, cursor: 'pointer' }}
        >
          ↩ Undo
        </button>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #EF444444', background: '#1E293B', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}
        >
          ✕ Clear
        </button>
      </div>
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
export { DrawingCanvas };
