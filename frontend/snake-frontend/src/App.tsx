import { useState, useEffect, useRef } from "react";
import { useInputUserName } from "./hooks/useUsername";
import { useRoomLogic } from "./hooks/roomLogic";
import { WebSocketProvider, useWebSocketContext } from "./context/WebSocketContext";
import NameInput from "./components/inputUsername";
import MainMenu from "./components/MainMenu";
import CreateRoom from "./components/createRoom";
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
  const { rooms, createNewRoom } = useRoomLogic();
  const { isConnected, connect, sendMessage, playerData } = useWebSocketContext();
  const [isCreateRoom, setIsCreateRoom] = useState(false);
  const [isFindRoom, setIsFindRoom] = useState(false);
  const alreadyCreatedRoom = useRef(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const hasAttemptedReconnect = useRef(false);

  // Firewall for valid user session
  const isValid = userSession();

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
      // Only attempt once and if not already connected
      if (hasAttemptedReconnect.current || isConnected) return;

      const storedPlayerData = getPlayerData();
      const serverIp = localStorage.getItem("serverIp");
      const serverPort = localStorage.getItem("serverPort");

      // Check if we have all required data
      if (storedPlayerData && serverIp && serverPort) {
        console.log("Attempting auto-reconnect with stored data:", storedPlayerData);
        hasAttemptedReconnect.current = true;
        setIsReconnecting(true);

        try {
          const wsUrl = `ws://${serverIp}:${serverPort}/ws`;

          // Connect to WebSocket
          const connected = await connect(wsUrl);

          if (connected) {
            // Wait for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 200));

            // Send reconnect message
            sendMessage({
              type: "reconnect",
              data: {
                id: storedPlayerData.id,
                unique_id: storedPlayerData.unique_id,
              }
            });

            console.log("Auto-reconnect message sent");

            // Wait for server response
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error("Auto-reconnect failed:", error);
          // Clear invalid data on reconnect failure
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

  // Start Game Handler
  const handleStartGame = (roomId: string) => {
    setCurrentGame({ roomId, playerName: userName });
    setIsCreateRoom(false);
  };

  // Leave Game Handler
  const handleLeaveGame = () => {
    setCurrentGame(null);
  };

  // Prevent Refresh go back to Main Menu
  const OnCreateMenu = localStorage.getItem("InCreatingRoom");
  const OnFindMenu = localStorage.getItem("InFindingRoom");

  useEffect(() => {
    if (OnCreateMenu === "true") {
      setIsCreateRoom(true);
    }

    if (OnFindMenu === "true") {
      setIsFindRoom(true);
    }
  }, [OnCreateMenu, OnFindMenu]);

  useEffect(() => {
    if (isCreateRoom && !alreadyCreatedRoom.current) {
      createNewRoom();
      alreadyCreatedRoom.current = true;
    }
    if (!isCreateRoom) {
      alreadyCreatedRoom.current = false;
    }
  }, [isCreateRoom, createNewRoom]);

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
      ) : isCreateRoom ? (
        <CreateRoom
          rooms={rooms}
          onBack={() => setIsCreateRoom(false)}
          onStartGame={() =>
            handleStartGame(rooms[rooms.length - 1]?.room_id || "12345")
          }
        />
      ) : isFindRoom ? (
        <FindRoom
          onBack={() => setIsFindRoom(false)}
          onJoinGame={handleStartGame}
        />
      ) : (
        <MainMenu
          onQuit={deleteUserName}
          onCreateRoom={() => setIsCreateRoom(true)}
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
