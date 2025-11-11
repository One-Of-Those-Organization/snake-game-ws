import { useEffect, useRef } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

export default function SnakeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // WebSocket URL
  const WS_URL = `ws://localhost:8080/ws`;
  const { isConnected, gameState, playerSnake, sendMove } =
    useWebSocket(WS_URL);

  // Handle Key Press for Movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        sendMove(0);
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        sendMove(1);
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        sendMove(2);
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        sendMove(3);
      }
    };

    // Read Key Presses
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sendMove]);

  // Canvas Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gridSize = 32;
    const cellSize = canvas.width / gridSize;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState.foods && Array.isArray(gameState.foods)) {
      ctx.fillStyle = "#EF4444";
      gameState.foods.forEach((f: any) => {
        ctx.fillRect(
          f.X * cellSize,
          f.Y * cellSize,
          cellSize - 1,
          cellSize - 1
        );
      });
    }

    // Draw Snakes
    if (gameState.snakes && Array.isArray(gameState.snakes)) {
      gameState.snakes.forEach((snake: any) => {
        if (snake.Body && Array.isArray(snake.Body)) {
          snake.Body.forEach((pos: any, index: number) => {
            if (playerSnake && snake.ID === playerSnake.ID) {
              ctx.fillStyle = index === 0 ? "#10B981" : "#22D3EE";
            } else {
              ctx.fillStyle = snake.Color || "#FFFFFF";
            }
            ctx.fillRect(
              pos.X * cellSize,
              pos.Y * cellSize,
              cellSize - 1,
              cellSize - 1
            );
          });
        }
      });
    }
  }, [gameState, playerSnake]);

  // Render Component
  return (
    <div className="relative flex flex-col justify-center items-center w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="absolute top-4 left-4">
        <span className={isConnected ? "text-green-400" : "text-red-400"}>
          {isConnected ? "Ping" : "Disconnected"}
        </span>
      </div>

      <div className="absolute top-8 p-4 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <p className="text-gray-400 text-xs font-semibold text-center mb-1">
          Your Snake ID
        </p>
        <div className="text-white text-lg font-bold text-center">
          {playerSnake?.ID ?? "-"}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        className="border-4 border-gray-700 rounded-lg shadow-2xl w-[80vmin] h-[80vmin]"
        style={{ imageRendering: "pixelated" }}
      />

      <div className="absolute bottom-8 text-gray-400 text-sm text-center">
        <p className="font-semibold mb-1">Controls</p>
        <p className="text-xs">Arrow Keys / WASD to move</p>
      </div>
    </div>
  );
}
