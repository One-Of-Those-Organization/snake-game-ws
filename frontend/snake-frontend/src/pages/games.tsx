import { useEffect, useRef, useState } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import GameResult from "../components/GameResult";
import type { SnakeCanvasProps } from "../api/interface";

export default function SnakeCanvas({ roomId, onBack }: SnakeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isConnected, gameState, playerData, sendMove, deathData, clearDeathData } = useWebSocketContext();

    // Store previous game state for interpolation
    const prevGameStateRef = useRef<any>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    const [interpolatedState, setInterpolatedState] = useState<any>(null);

    // Handle keyboard input for snake movement
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't accept input if dead
            if (deathData) return;

            // Prevent default scrolling behavior
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            // Direction mapping: Right = 0, Down = 1, Left = 2, Up = 3
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                sendMove(0);
            } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
                sendMove(1);
            } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                sendMove(2);
            } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                sendMove(3);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sendMove, deathData]);

    // Update interpolation when gameState changes
    useEffect(() => {
        if (gameState) {
            prevGameStateRef.current = interpolatedState || gameState;
            lastUpdateTimeRef.current = Date.now();
            setInterpolatedState(gameState);
        }
    }, [gameState, interpolatedState]);

    // Render game canvas with smooth interpolation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const GRID_SIZE = 32;
        const CELL_SIZE = canvas.width / GRID_SIZE; // 512 / 32 = 16 pixels per cell
        const SERVER_TICK_RATE = 150; // Backend updates every 150ms

        let animationFrameId: number;

        const render = () => {
            // Clear canvas
            ctx.fillStyle = "#111827";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (interpolatedState) {
                // Calculate interpolation factor (0 to 1)
                const timeSinceUpdate = Date.now() - lastUpdateTimeRef.current;
                const interpolationFactor = Math.min(timeSinceUpdate / SERVER_TICK_RATE, 1);

                // Render foods - simple rendering without animation
                const foods = interpolatedState.foods || interpolatedState.Foods;
                if (foods && Array.isArray(foods)) {
                    ctx.fillStyle = "#EF4444"; // Red

                    foods.forEach((food: any) => {
                        // Handle: food.pos.x/y OR food.Position.X/Y OR food.x/y
                        const pos = food.pos || food.Pos || food.Position || food.position || food;
                        const x = pos.x ?? pos.X;
                        const y = pos.y ?? pos.Y;

                        if (x !== undefined && y !== undefined) {
                            ctx.fillRect(
                                x * CELL_SIZE,
                                y * CELL_SIZE,
                                CELL_SIZE - 1,
                                CELL_SIZE - 1
                            );
                        }
                    });
                }

                // Render snakes with interpolation
                const players = interpolatedState.snakes || interpolatedState.Snakes || interpolatedState.players || interpolatedState.Players;
                const prevPlayers = prevGameStateRef.current ? 
                    (prevGameStateRef.current.snakes || prevGameStateRef.current.Snakes || prevGameStateRef.current.players || prevGameStateRef.current.Players) : 
                    null;

                if (players && Array.isArray(players)) {
                    players.forEach((player: any) => {
                        const snake = player.snake || player.Snake;
                        const playerId = player.id ?? player.ID ?? player.PlayerId ?? player.player_id;
                        const currentPlayerId = playerData?.id;

                        if (snake) {
                            const body = snake.body || snake.Body;

                            // Find previous position for this player
                            let prevBody = null;
                            if (prevPlayers && Array.isArray(prevPlayers)) {
                                const prevPlayer = prevPlayers.find((p: any) => {
                                    const prevId = p.id ?? p.ID ?? p.PlayerId ?? p.player_id;
                                    return prevId === playerId;
                                });
                                if (prevPlayer) {
                                    const prevSnake = prevPlayer.snake || prevPlayer.Snake;
                                    prevBody = prevSnake?.body || prevSnake?.Body;
                                }
                            }

                            if (body && Array.isArray(body)) {
                                const isCurrentPlayer = playerId === currentPlayerId;

                                body.forEach((segment: any, index: number) => {
                                    const currX = segment.x ?? segment.X;
                                    const currY = segment.y ?? segment.Y;

                                    if (currX !== undefined && currY !== undefined) {
                                        let renderX = currX;
                                        let renderY = currY;

                                        // Interpolate position if we have previous data
                                        if (prevBody && prevBody[index] && interpolationFactor < 1) {
                                            const prevX = prevBody[index].x ?? prevBody[index].X;
                                            const prevY = prevBody[index].y ?? prevBody[index].Y;

                                            if (prevX !== undefined && prevY !== undefined) {
                                                // Only interpolate if distance is 1 cell (normal movement)
                                                const dx = currX - prevX;
                                                const dy = currY - prevY;

                                                if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                                                    renderX = prevX + dx * interpolationFactor;
                                                    renderY = prevY + dy * interpolationFactor;
                                                }
                                            }
                                        }

                                        // Color logic
                                        if (isCurrentPlayer) {
                                            ctx.fillStyle = index === 0 ? "#10B981" : "#22D3EE";
                                        } else {
                                            ctx.fillStyle = snake.color || snake.Color || "#FFFFFF";
                                        }

                                        ctx.fillRect(
                                            renderX * CELL_SIZE,
                                            renderY * CELL_SIZE,
                                            CELL_SIZE - 1,
                                            CELL_SIZE - 1
                                        );
                                    }
                                });
                            }
                        }
                    });
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        // Start the render loop
        render();

        // Cleanup
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [interpolatedState, playerData]);

    // Get current player's score
    const currentScore = (() => {
        if (!gameState || !playerData) return 0;

        const players = gameState.snakes || gameState.Snakes || gameState.players || gameState.Players;
        if (!players || !Array.isArray(players)) return 0;

        const currentPlayer = players.find((p: any) => {
            const playerId = p.id ?? p.ID ?? p.PlayerId ?? p.player_id;
            return playerId === playerData.id;
        });

        if (!currentPlayer) return 0;

        const snake = currentPlayer.snake || currentPlayer.Snake;
        if (!snake) return 0;

        return snake.body_len ?? snake.bodyLen ?? snake.BodyLen ?? snake.body?.length ?? snake.Body?.length ?? 0;
    })();

    // Get player count
    const playerCount = (() => {
        if (!gameState) return 0;
        const players = gameState.snakes || gameState.Snakes || gameState.players || gameState.Players;
        return players?.length || 0;
    })();

    // Handle death - exit room and show game over
    const handleDeath = () => {
        clearDeathData();
        onBack();
    };

    // Get final score from death data
    const finalScore = deathData?.snake?.body_len ?? deathData?.snake?.bodyLen ?? 0;

    return (
        <div className="relative flex flex-col justify-center items-center w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800">
            {/* Connection Status */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                <span className={`text-sm font-semibold ${isConnected ? "text-green-400" : "text-red-400"}`}>
                    {isConnected ? "Connected" : "Disconnected"}
                </span>
            </div>

            {/* Quit Button */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold shadow-lg"
                >
                    Leave Room
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
                <p className="text-gray-500 text-xs text-center mt-2">
                    Players: {playerCount}
                </p>
            </div>

            {/* Game Canvas */}
            <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="border-4 border-gray-700 rounded-lg shadow-2xl w-[80vmin] h-[80vmin]"
                style={{ imageRendering: "pixelated" }}
            />

            {/* Controls Info */}
            <div className="absolute bottom-8 left-8 text-gray-400 text-sm">
                <p className="font-semibold mb-1">Controls</p>
                <p className="text-xs">Arrow Keys / WASD to move</p>
            </div>

            {/* Player Score */}
            <div className="absolute bottom-8 right-8 p-3 bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
                <p className="text-gray-400 text-xs mb-1">Your Score</p>
                <p className="text-white text-2xl font-bold">{currentScore}</p>
            </div>

            {/* Death Dialog */}
            {deathData && (
                <GameResult
                    score={finalScore}
                    onLeave={handleDeath}
                />
            )}
        </div>
    );
}
