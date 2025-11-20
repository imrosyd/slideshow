import { useState, useEffect, useRef } from 'react';

const useWebSocket = (onMessage: (message: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https' ? 'wss' : 'ws';
      const host = window.location.host;
      ws.current = new WebSocket(`${protocol}://${host}`);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Optional: attempt to reconnect
        setTimeout(connect, 5000);
      };

      ws.current.onerror = (error) => {
        // Suppress errors if the socket is closing or closed, which happens frequently in dev (Strict Mode)
        if (ws.current?.readyState === WebSocket.CLOSING || ws.current?.readyState === WebSocket.CLOSED) {
          return;
        }
        // Also suppress generic "error" events during connection phase
        if (ws.current?.readyState === WebSocket.CONNECTING) {
          return;
        }
        console.error('WebSocket error:', error);
        ws.current?.close();
      };
    };

    connect();

    return () => {
      if (ws.current) {
        // Remove all listeners to prevent memory leaks and callbacks
        ws.current.onopen = null;
        ws.current.onmessage = null;
        ws.current.onerror = null;
        ws.current.onclose = null;

        if (ws.current.readyState === WebSocket.CONNECTING) {
          // Closing a CONNECTING socket triggers "WebSocket is closed before the connection is established"
          // Workaround: Wait for it to open, then close it immediately
          const socket = ws.current;
          socket.onopen = () => {
            socket.close();
          };
        } else {
          ws.current.close();
        }
      }
    };
  }, [onMessage]);

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent.');
    }
  };

  return { isConnected, sendMessage };
};

export default useWebSocket;
