import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [playerSnake, setPlayerSnake] = useState<any>(null);

  // Connect to WebSocket
  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    // Connection Handlers
    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: "string", data: "ready" }));
    };

    // Message Handlers
    // Sama kek yang kirim kirim broadcast
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "p_snake") {
        setPlayerSnake(msg.data);
      } else if (msg.type === "state") {
        setGameState(msg.data);
      } else if (msg.type === "s_death") {
        console.log("You died!");
      } else if (msg.type === "fail") {
        console.error("Error:", msg.data);
      }
    };

    // Close Handlers
    ws.onclose = () => {
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => ws.close();
  }, [url]);

  // Send Move Command from Player
  const sendMove = useCallback((direction: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "input", dir: direction }));
    }
  }, []);

  return { isConnected, gameState, playerSnake, sendMove };
}
