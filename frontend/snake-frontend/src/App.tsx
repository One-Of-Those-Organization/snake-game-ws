import { useState, useEffect, useRef } from "react";
import { useInputUserName } from "./hooks/useUsername";
import { WebSocketProvider, useWebSocketContext } from "./context/WebSocketContext";
import NameInput from "./components/inputUsername";
import MainMenu from "./components/MainMenu";
import FindRoom from "./components/findRoomById";
import SnakeCanvas from "./pages/games";

function AppContent() {
    const {
        userName,
        userSession,
        isFirstLogin,
        setUserName,
        saveUserName,
        deleteUserName,
        getPlayerData,
    } = useInputUserName();
    const { isConnected, connect, sendMessage, playerData, reconnectFailed, clearReconnectFailed, disconnect, createdRoom } = useWebSocketContext();
    const [isFindRoom, setIsFindRoom] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const hasAttemptedReconnect = useRef(false);

    // Firewall for valid user session
    const isValid = userSession();

    // Handle reconnect failure - redirect to login
    useEffect(() => {
        if (reconnectFailed) {
            console.log("Reconnect failed detected, clearing state and redirecting to login");
            localStorage.clear();
            deleteUserName();
            setIsReconnecting(false);
            hasAttemptedReconnect.current = false;
            clearReconnectFailed();
        }
    }, [reconnectFailed, deleteUserName, clearReconnectFailed]);

    // Debug logging
    useEffect(() => {
        console.log("App State:", {
            isConnected,
            isValid,
            userName,
            isFirstLogin,
            hasPlayerData: !!playerData,
        });
    }, [isConnected, isValid, userName, isFirstLogin, playerData]);

    // Auto-reconnect on mount if localStorage has player data
    useEffect(() => {
        const attemptAutoReconnect = async () => {
            if (hasAttemptedReconnect.current || isConnected) return;

            const storedPlayerData = getPlayerData();
            const serverIp = localStorage.getItem("serverIp");
            const serverPort = localStorage.getItem("serverPort");

            if (storedPlayerData && serverIp && serverPort) {
                console.log("Attempting auto-reconnect with stored data:", storedPlayerData);
                hasAttemptedReconnect.current = true;
                setIsReconnecting(true);

                try {
                    const wsUrl = `ws://${serverIp}:${serverPort}/ws`;
                    const connected = await connect(wsUrl);

                    if (connected) {
                        await new Promise(resolve => setTimeout(resolve, 200));

                        sendMessage({
                            type: "reconnect",
                            data: {
                                id: storedPlayerData.id,
                                unique_id: storedPlayerData.unique_id,
                            }
                        });

                        console.log("Auto-reconnect message sent");
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error("Auto-reconnect failed:", error);
                    deleteUserName();
                } finally {
                    setIsReconnecting(false);
                }
            }
        };

        attemptAutoReconnect();
    }, [isConnected, connect, sendMessage, getPlayerData, deleteUserName]);

    // Current Game State
    const [currentGame, setCurrentGame] = useState<{
        roomId: string;
        playerName: string;
    } | null>(null);

    // Auto-join game when room is created
    useEffect(() => {
        if (createdRoom && createdRoom.id) {
            console.log("Room created, auto-joining:", createdRoom.id);
            setCurrentGame({
                roomId: createdRoom.id,
                playerName: userName
            });
        }
    }, [createdRoom, userName]);

    // Start Game Handler
    const handleStartGame = (roomId: string) => {
        setCurrentGame({ roomId, playerName: userName });
        setIsFindRoom(false);
    };

    // Leave Game Handler
    const handleLeaveGame = () => {
        sendMessage({
            type: "disconnect",
            data: {}
        });
        setCurrentGame(null);
    };

    // Prevent Refresh go back to Main Menu
    const OnFindMenu = localStorage.getItem("InFindingRoom");

    useEffect(() => {
        if (OnFindMenu === "true") {
            setIsFindRoom(true);
        }
    }, [OnFindMenu]);

    // Show reconnecting screen
    if (isReconnecting) {
        return (
            <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="p-8 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center w-80">
                    <h2 className="text-white text-2xl font-bold mb-4 text-center">
                        Reconnecting...
                    </h2>
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm mt-4 text-center">
                        Restoring your session
                    </p>
                </div>
            </div>
        );
    }

    // Show NameInput if NOT connected OR NOT valid session
    const shouldShowNameInput = !isConnected || !isValid;

    if (shouldShowNameInput) {
        return (
            <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <NameInput
                    userName={userName}
                    setUserName={setUserName}
                    onConfirm={saveUserName}
                />
            </div>
        );
    }

    // Only render other pages if both connected AND valid session
    return (
        <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            {currentGame ? (
                <SnakeCanvas
                    roomId={currentGame.roomId}
                    playerName={currentGame.playerName}
                    onBack={handleLeaveGame}
                />
            ) : isFindRoom ? (
                <FindRoom
                    onBack={() => setIsFindRoom(false)}
                    onJoinGame={handleStartGame}
                />
            ) : (
                <MainMenu
                    onQuit={() => {
                        deleteUserName();
                        disconnect();
                    }}
                    onCreateRoom={() => {
                        // Send create room message to server
                        sendMessage({
                            type: "create",
                            data: {}
                        });
                        // Room will be auto-joined when createdRoom state updates
                    }}
                    onFindRoom={() => setIsFindRoom(true)}
                />
            )}
        </div>
    );
}

export default function App() {
    return (
        <WebSocketProvider>
            <AppContent />
        </WebSocketProvider>
    );
}
