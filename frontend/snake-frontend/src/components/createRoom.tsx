import { useEffect } from "react";
import { useInputUserName } from "../hooks/useUsername";
import { useRoomLogic } from "../hooks/roomLogic";
import type { CreateRoomProps } from "../api/interface";

// Create Room
export default function CreateRoom({
  onBack,
  onStartGame,
}: CreateRoomProps) {
  // Get Current Username
  const { userName } = useInputUserName();
  const { getCurrentRoom } = useRoomLogic();

  // Another useEffect to Check Current User Status
  useEffect(() => {
    localStorage.setItem("InCreatingRoom", "true");
  }, []);

  // Get the room data from server
  const currentRoom = getCurrentRoom();
  const roomId = currentRoom ? currentRoom.room : "-----";

  // Handle Back with Delete the Current User Status in Creating Room
  const handleBack = () => {
    localStorage.removeItem("InCreatingRoom");
    onBack();
  };

  return (
    <div className="p-8 bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center w-80">
      <h1 className="text-white text-2xl mb-6 font-semibold text-center">
        {userName}'s Room
      </h1>

      {/* Display Room ID from SERVER */}
      <div className="flex justify-center gap-2 mb-6">
        {roomId.split("").map((digit, index) => (
          <div
            key={index}
            className="w-10 h-12 bg-gray-700 text-white text-xl font-bold flex items-center justify-center rounded-md shadow-inner border border-gray-600"
          >
            {digit}
          </div>
        ))}
      </div>

      <button
        onClick={() => onStartGame(roomId)}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mb-6"
      >
        Start Game
      </button>

      <button
        onClick={handleBack}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
      >
        Back
      </button>
    </div>
  );
}
