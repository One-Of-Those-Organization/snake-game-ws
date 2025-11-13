import { createContext, useContext, ReactNode, useRef, useState, useCallback } from 'react';

interface PlayerData {
    id: number;
    name: string;
    unique_id: string;
}

interface WebSocketContextType {
    ws: WebSocket | null;
    isConnected: boolean;
    playerData: PlayerData | null;
    sendMessage: (message: any) => void;
    gameState: any;
    playerSnake: any;
    sendMove: (direction: number) => void;
    connect: (url: string) => Promise<boolean>;
    disconnect: () => void;
    reconnectFailed: boolean;
    clearReconnectFailed: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<any>(null);
    const [playerSnake, setPlayerSnake] = useState<any>(null);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [reconnectFailed, setReconnectFailed] = useState(false);

    const clearReconnectFailed = useCallback(() => {
        setReconnectFailed(false);
    }, []);

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
                            // Store player data from server
                            const player: PlayerData = {
                            id: msg.data.id,
                            name: msg.data.name,
                            unique_id: msg.data.unique_id,
                        };
                        setPlayerData(player);

                        // Save to localStorage
                        localStorage.setItem("playerId", player.id.toString());
                        localStorage.setItem("playerName", player.name);
                        localStorage.setItem("playerUniqueId", player.unique_id);

                        console.log("Player data saved:", player);
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

                        // Check if this is a reconnect failure
                        if (msg.response === "reconnect") {
                            console.log("Reconnect failed, clearing localStorage and redirecting to login");
                            // Clear all localStorage
                            localStorage.clear();
                            setPlayerData(null);
                            setIsConnected(false);
                            setReconnectFailed(true);
                        }
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
        setPlayerData(null);
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
            playerData,
            sendMessage,
            gameState,
            playerSnake,
            sendMove,
            connect,
            disconnect,
            reconnectFailed,
            clearReconnectFailed
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
