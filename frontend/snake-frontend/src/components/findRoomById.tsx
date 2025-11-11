import { useEffect, useRef, useState } from "react";
import type { FindRoomProps } from "../api/interface";

// Find Room
export default function FindRoom({ onBack }: FindRoomProps) {
  // Input Room ID
  const [roomId, setRoomId] = useState(["", "", "", "", ""]);
  // Refs for input elements
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Another useEffect to Check Current User Status
  useEffect(() => {
    localStorage.setItem("InFindingRoom", "true");
  }, []);

  // Handle Input Changes only numbers and auto-focus
  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newRoomId = [...roomId];
    newRoomId[index] = value;
    setRoomId(newRoomId);

    // Auto-focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace to go to previous input
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace: go to previous input
    if (e.key === "Backspace" && !roomId[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Join Room (Placeholder for actual API call)
  const handleJoinRoom = () => {
    const fullRoomId = roomId.join("");
    if (fullRoomId.length === 5) {
      console.log("Joining room:", fullRoomId);
      // TODO: Call findRoomById(fullRoomId) or API
      localStorage.removeItem("InFindingRoom");
    }
  };

  // Same as CreateRoom, handle Back with removing Finding Room status
  const handleBack = () => {
    localStorage.removeItem("InFindingRoom");
    onBack();
  };

  return (
    <div className="p-8 bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center w-80">
      <h1 className="text-white text-2xl mb-6 font-semibold text-center">
        Find Room
      </h1>

      {/* Input Field Room ID */}
      <div className="flex justify-center gap-2 mb-6">
        {roomId.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-10 h-12 bg-gray-700 text-white text-xl font-bold text-center rounded-md shadow-inner border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        ))}
      </div>

      {/* Join Room Button if the 5 digits are filled */}
      <button
        onClick={handleJoinRoom}
        disabled={roomId.join("").length !== 5}
        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors mb-4"
      >
        Join Room
      </button>

      {/* Same as CreateRoom, handle Back with removing Finding Room status */}
      <button
        onClick={handleBack}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mb-4"
      >
        Back to Menu
      </button>

      <p className="text-gray-400 text-sm text-center">
        Please input a room ID to join a room.
      </p>
    </div>
  );
}
