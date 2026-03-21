import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useIngress } from './IngressContext';
import type { WSMessage } from '../lib/types';

interface WebSocketContextValue {
  send: (message: WSMessage) => void;
  lastMessage: WSMessage | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  send: () => {},
  lastMessage: null,
  isConnected: false,
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { basePath, ready } = useIngress();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retriesRef = useRef(0);

  const connect = useCallback(() => {
    if (!ready) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}${basePath}/api/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        setLastMessage(data);
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [basePath, ready]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ send, lastMessage, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
