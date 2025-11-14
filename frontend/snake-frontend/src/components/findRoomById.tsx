import { useEffect, useRef, useState } from "react";
import type { FindRoomProps } from "../api/interface";
import { useWebSocketContext } from "../context/WebSocketContext";

// Find Room
export default function FindRoom({ onBack, onJoinGame }: FindRoomProps) {
  // Input Room ID
  const [roomId, setRoomId] = useState(["", "", "", "", ""]);
  // Refs for input elements
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Set Joining Room Status
  const [isJoining, setIsJoining] = useState(false);
  // Get WebSocket Context
  const { joinError, clearJoinError, sendMessage, playerSnake } =
    useWebSocketContext();

  // Another useEffect to Check Current User Status
  useEffect(() => {
    localStorage.setItem("InFindingRoom", "true");

    return () => {
      clearJoinError();
    };
  }, [clearJoinError]);

  useEffect(() => {
    if (playerSnake && isJoining) {
      const fullRoomId = roomId.join("");
      console.log("Successfully joined room:", fullRoomId);
      onJoinGame(fullRoomId);
      localStorage.removeItem("InFindingRoom");
      setIsJoining(false);
    }
  }, [playerSnake, isJoining, roomId, onJoinGame]);

  useEffect(() => {
    if (joinError) {
      console.log("Failed to join room:", joinError);
      setIsJoining(false);
      // Reset room ID input
      setRoomId(["", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }, [joinError]);

  // Handle Input Changes only numbers and auto-focus
  const handleChange = (index: number, value: string) => {
    const newRoomId = [...roomId];

    newRoomId[index] = value.toUpperCase();

    if (newRoomId[index] && value) {
      newRoomId[index] = value.toUpperCase();
      setRoomId(newRoomId);

      // Auto-focus next input kalau belum di akhir
      if (index < 4) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value) {
      newRoomId[index] = value.toUpperCase();
      setRoomId(newRoomId);

      if (index < 4) {
        inputRefs.current[index + 1]?.focus();
      }
    } else {
      newRoomId[index] = "";
      setRoomId(newRoomId);
    }
  };

  // Handle Backspace to go to previous input
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace: go to previous input
    if (e.key === "Backspace") {
      const newRoomId = [...roomId];

      if (newRoomId[index]) {
        // Kalau ada isi, hapus dulu
        newRoomId[index] = "";
        setRoomId(newRoomId);
      } else if (index > 0) {
        // Kalau kosong, pindah ke previous dan hapus
        newRoomId[index - 1] = "";
        setRoomId(newRoomId);
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "Enter" && roomId.join("").length === 5) {
      handleJoinRoom();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Join Room (Placeholder for actual API call)
  const handleJoinRoom = () => {
    // To Consistence with server, convert to uppercase
    const fullRoomId = roomId.join("").toUpperCase();
    if (fullRoomId.length === 5) {
      setIsJoining(true);
      clearJoinError();

      // Send join room message via WebSocket
      sendMessage({ type: "join", data: { room: fullRoomId } });
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

      {joinError && (
        <div className="mb-4 p-3 bg-red-600 text-white rounded-lg text-sm text-center w-full">
          {joinError}
        </div>
      )}

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
            disabled={isJoining}
            className="w-10 h-12 bg-gray-700 text-white text-xl font-bold text-center rounded-md shadow-inner border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        ))}
      </div>

      {/* Join Room Button if the 5 digits are filled */}
      <button
        onClick={handleJoinRoom}
        disabled={roomId.join("").length !== 5 || isJoining}
        className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors mb-4 flex items-center justify-center gap-2 font-semibold"
      >
        {isJoining ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Joining...
          </>
        ) : (
          "Join Room"
        )}
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
