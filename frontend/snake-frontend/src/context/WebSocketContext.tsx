import { createContext, useContext, ReactNode, useRef, useState, useCallback } from 'react';

interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
  gameState: any;
  playerSnake: any;
  sendMove: (direction: number) => void;
  connect: (url: string) => Promise<boolean>;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [playerSnake, setPlayerSnake] = useState<any>(null);

  const connect = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        // Set timeout for connection
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, 5000); // 5 second timeout

        ws.onopen = () => {
          clearTimeout(timeout);
          setIsConnected(true);
          console.log('WebSocket connected to:', url);
          resolve(true);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          console.log('Received message:', msg);

          switch (msg.type) {
            case "player":
              // Sent when player connects - contains ID, Name, UniqeID
              console.log("Player data:", msg.data);
              setPlayerSnake(msg.data);
              break;

            case "room":
              // Sent when creating a new room - contains room data
              console.log("Room created:", msg.data);
              break;

            case "snake":
              // Sent when joining a room - contains snake data
              console.log("Snake data:", msg.data);
              setPlayerSnake(msg.data);
              break;

            case "broadcast_room":
              // Game state broadcast - contains snakes and foods
              setGameState(msg.data);
              break;

            case "broadcast_snake_ded":
              // Sent when your snake dies
              console.log("Snake died:", msg.data);
              // TODO: Handle snake death (show game over screen, etc.)
              break;

            case "ok":
              // Generic success response (e.g., from disconnect)
              console.log("Operation successful:", msg.data);
              break;

            case "fail":
              // Error message from server
              console.error("Server error:", msg.data);
              // TODO: Show error to user
              break;

            default:
              console.warn("Unknown message type:", msg.type);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          setIsConnected(false);
          reject(error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('Sent message:', message);
    } else {
      console.warn("WebSocket not open, message not sent:", message);
    }
  }, []);

  const sendMove = useCallback((direction: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "input", data: { dir: direction } }));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{
      ws: wsRef.current,
      isConnected,
      sendMessage,
      gameState,
      playerSnake,
      sendMove,
      connect,
      disconnect
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
