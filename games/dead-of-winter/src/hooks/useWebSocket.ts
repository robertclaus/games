import { useEffect, useRef, useCallback } from 'react';

export interface WsMessage {
  from: string;
  to: string;
  type: string;
  payload: unknown;
}

export type MessageHandler = (msg: WsMessage) => void;

export function useWebSocket(
  url: string | null,
  onMessage: MessageHandler,
  onConnect?: () => void,
  onDisconnect?: () => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onConnectRef.current = onConnect; }, [onConnect]);
  useEffect(() => { onDisconnectRef.current = onDisconnect; }, [onDisconnect]);

  useEffect(() => {
    if (!url) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => onConnectRef.current?.();
    ws.onclose = () => onDisconnectRef.current?.();
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        onMessageRef.current(msg);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    return () => ws.close();
  }, [url]);

  const send = useCallback((to: string, type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ to, type, payload }));
    }
  }, []);

  return { send };
}
