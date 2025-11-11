import { useEffect, useRef } from "react";

export default function SnakeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeId = "12345";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // TODO: Snake game logic here
    console.log(canvas)
  }, []);

  return (
    <div className="relative flex flex-col justify-center items-center w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="absolute top-8 p-4 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <p className="text-gray-400 text-xs font-semibold text-center mb-1">
          Your Room ID
        </p>
        <div className="flex justify-center gap-1">
          {snakeId.split("").map((digit, index) => (
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
        id="canvas"
        width={32}
        height={32}
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