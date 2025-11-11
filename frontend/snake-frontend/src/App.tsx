import { useState, useEffect, useRef } from "react";
import { useInputUserName } from "./hooks/useUsername";
import { useRoomLogic } from "./hooks/roomLogic";
import NameInput from "./components/inputUsername";
import MainMenu from "./components/MainMenu";
import CreateRoom from "./components/createRoom";
import FindRoom from "./components/findRoomById";

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
      {/* First input Name */}
      {!isValid && isFirstLogin ? (
        <NameInput
          userName={userName}
          setUserName={setUserName}
          onConfirm={saveUserName}
        />
        // Create Room or Find Room
      ) : isCreateRoom ? (
        <CreateRoom rooms={rooms} onBack={() => setIsCreateRoom(false)} />
      ) : isFindRoom ? (
        <FindRoom onBack={() => setIsFindRoom(false)} />
        // Default Main Menu
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
