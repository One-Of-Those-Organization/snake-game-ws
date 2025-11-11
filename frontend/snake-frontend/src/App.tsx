import { useState, useEffect, useRef } from "react";
import { useInputUserName } from "./hooks/useUsername";
import { useRoomLogic } from "./hooks/roomLogic";
import NameInput from "./components/inputUsername";
import MainMenu from "./components/MainMenu";
import CreateRoom from "./components/createRoom";
import FindRoom from "./components/findRoomById";
import SnakeCanvas from "./pages/games";

export default function App() {
  const {
    userName,
    userSession,
    isFirstLogin,
    setUserName,
    saveUserName,
    deleteUserName,
  } = useInputUserName();
  const { rooms, createNewRoom } = useRoomLogic();
  const [isCreateRoom, setIsCreateRoom] = useState(false);
  const [isFindRoom, setIsFindRoom] = useState(false);
  const alreadyCreatedRoom = useRef(false);

  // Firewall for valid user session
  const isValid = userSession();

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

  // Sorry i use useEffect, because i don't know other better way :)
  useEffect(() => {
    if (OnCreateMenu === "true") {
      setIsCreateRoom(true);
    }

    if (OnFindMenu === "true") {
      setIsFindRoom(true);
    }
  }, [OnCreateMenu, OnFindMenu]);

  // Same thing here, to prevent multiple room creation on re-renders
  useEffect(() => {
    if (isCreateRoom && !alreadyCreatedRoom.current) {
      createNewRoom();
      alreadyCreatedRoom.current = true;
    }
    if (!isCreateRoom) {
      alreadyCreatedRoom.current = false;
    }
  }, [isCreateRoom]);

  // At least the return is simplyfied by separating components
  return (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      {currentGame ? (
        <SnakeCanvas
          roomId={currentGame.roomId}
          playerName={currentGame.playerName}
          onBack={handleLeaveGame}
        />
      ) : !isValid && isFirstLogin ? (
        <NameInput
          userName={userName}
          setUserName={setUserName}
          onConfirm={saveUserName}
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
