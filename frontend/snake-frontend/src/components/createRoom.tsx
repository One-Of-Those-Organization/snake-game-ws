import { useEffect } from "react";
import { useInputUserName } from "../hooks/useUsername";
import type { CreateRoomProps } from "../api/interface";

// Create Room
export default function CreateRoom({ rooms, onBack }: CreateRoomProps) {
  // Get Current Username
  const { userName } = useInputUserName();

  // Another useEffect to Check Current User Status
  useEffect(() => {
    localStorage.setItem("InCreatingRoom", "true");
  }, []);

  // Get the latest room created
  const latestRoom = rooms[rooms.length - 1];
  // If no room, show placeholder
  const roomId = latestRoom ? latestRoom.room_id : "-----";

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

      {/* Display Room ID (REMINDER THAT THIS STILL RANDOM MATH) */}
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

      {/* Technically call onBack but also remove the Creating Room status */}
      <button
        onClick={handleBack}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mb-4"
      >
        Back to Menu
      </button>

      <p className="text-gray-400 text-sm text-center">
        Share this 5-digit code with your friends to join!
      </p>
    </div>
  );
}
