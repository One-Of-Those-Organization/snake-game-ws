import { createContext, useContext, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { PlayerData, WebSocketContextType } from '../api/interface';

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<any>(null);
    const [playerSnake, setPlayerSnake] = useState<any>(null);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [reconnectFailed, setReconnectFailed] = useState(false);
    const [createdRoom, setCreatedRoom] = useState<any | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [deathData, setDeathData] = useState<any | null>(null);

    const clearReconnectFailed = useCallback(() => {
        setReconnectFailed(false);
    }, []);

    const clearJoinError = useCallback(() => {
        setJoinError(null);
    }, []);

    const clearDeathData = useCallback(() => {
        setDeathData(null);
    }, []);

    // ✅ Clear all room-related state
    const clearRoomState = useCallback(() => {
        console.log("Clearing room state");
        setCreatedRoom(null);
        setPlayerSnake(null);
        setGameState(null);
        setDeathData(null);
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
                            const player: PlayerData = {
                            id: msg.data.id,
                            name: msg.data.name,
                            unique_id: msg.data.unique_id,
                        };
                        setPlayerData(player);

                        localStorage.setItem("playerId", player.id.toString());
                        localStorage.setItem("playerName", player.name);
                        localStorage.setItem("playerUniqueId", player.unique_id);

                        console.log("Player data saved:", player);
                        break;

                        case "room":
                            console.log("Room created:", msg.data);
                        setCreatedRoom(msg.data);
                        if (msg.data.id) {
                            localStorage.setItem("currentRoomId", msg.data.id);
                        }
                        break;

                        case "snake":
                            console.log("Snake data:", msg.data);
                        setPlayerSnake(msg.data);
                        setJoinError(null);
                        break;

                        case "broadcast_room":
                            setGameState(msg.data);
                        break;

                        case "broadcast_snake_ded":
                            // ✅ Handle snake death
                            console.log("Snake died:", msg.data);
                        setDeathData(msg.data);
                        localStorage.removeItem("currentRoomId");
                        break;

                        case "ok":
                            console.log("Operation successful:", msg.data);
                        if (msg.response === "disconnect") {
                            clearRoomState();
                            localStorage.removeItem("currentRoomId");
                        }
                        break;

                        case "fail":
                            console.error("Server error:", msg.data);
                        if (msg.data.context === "join") {
                            setJoinError(msg.data.message);
                        }

                        if (msg.response === "reconnect") {
                            console.log("Reconnect failed, clearing localStorage and redirecting to login");
                            localStorage.clear();
                            sessionStorage.clear();
                            setPlayerData(null);
                            setIsConnected(false);
                            setReconnectFailed(true);
                            clearRoomState();
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
    }, [clearRoomState]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setPlayerData(null);
        clearRoomState();
    }, [clearRoomState]);

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
            clearReconnectFailed,
            createdRoom,
            joinError,
            clearJoinError,
            clearRoomState,
            deathData,
            clearDeathData,
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
