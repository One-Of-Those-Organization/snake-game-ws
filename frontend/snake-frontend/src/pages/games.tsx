import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import type { SnakeCanvasProps } from "../api/interface";

export default function SnakeCanvas({ roomId, playerName, onBack }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const WS_URL = `ws://localhost:8080/ws?roomId=${roomId}&name=${playerName}`;
  const { isConnected, gameState, playerSnake, sendMove } = useWebSocket(WS_URL);

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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sendMove]);

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
          f.Position.X * cellSize,
          f.Position.Y * cellSize,
          cellSize - 1,
          cellSize - 1
        );
      });
    }

    if (gameState.snakes && Array.isArray(gameState.snakes)) {
      gameState.snakes.forEach((player: any) => {
        if (player.Snake && player.Snake.Body && Array.isArray(player.Snake.Body)) {
          player.Snake.Body.forEach((pos: any, index: number) => {
            if (playerSnake && player.ID === playerSnake.ID) {
              ctx.fillStyle = index === 0 ? "#10B981" : "#22D3EE";
            } else {
              ctx.fillStyle = player.Snake.Color || "#FFFFFF";
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

  return (
    <div className="relative flex flex-col justify-center items-center w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Connection Status */}
      <div className="absolute top-4 left-4">
        <span className={isConnected ? "text-green-400" : "text-red-400"}>
          {isConnected ? "●  Connected" : "●  Disconnected"}
        </span>
      </div>

      {/* Quit Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold"
        >
          Quit Room
        </button>
      </div>

      {/* Room ID Display */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 p-4 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <p className="text-gray-400 text-xs font-semibold text-center mb-2">
          Room ID - Share with friends!
        </p>
        <div className="flex justify-center gap-2">
          {roomId.split("").map((digit, index) => (
            <div
              key={index}
              className="w-8 h-10 bg-gray-700 text-white text-lg font-bold flex items-center justify-center rounded-md shadow-inner border border-gray-600"
            >
              {digit}
            </div>
          ))}
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
