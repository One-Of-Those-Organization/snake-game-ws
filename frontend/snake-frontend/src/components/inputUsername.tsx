import { useState, useEffect } from "react";
import type { UserData } from "../api/interface";
import { useWebSocketContext } from "../context/WebSocketContext";

export default function NameInput(props: UserData) {
  const { userName, setUserName, onConfirm } = props;
  const { sendMessage, isConnected, connect, playerData } = useWebSocketContext();

  // Server configuration state
  const [serverIp, setServerIp] = useState(() => {
    return localStorage.getItem("serverIp") || "localhost";
  });
  const [serverPort, setServerPort] = useState(() => {
    return localStorage.getItem("serverPort") || "8080";
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Watch for playerData changes and trigger onConfirm when received
  useEffect(() => {
    if (playerData && isConnected) {
      console.log("Player data received, calling onConfirm");
      onConfirm(playerData.name);
    }
  }, [playerData, isConnected, onConfirm]);

  const handleConfirm = async () => {
    if (!userName.trim()) {
      setError("Please enter your name!");
      return;
    }

    if (!serverIp.trim()) {
      setError("Please enter server IP!");
      return;
    }

    setIsConnecting(true);
    setError(null);

    // Build WebSocket URL
    const wsUrl = `ws://${serverIp}:${serverPort}/ws`;

    try {
      // Connect to WebSocket (wait for connection to establish)
      const connected = await connect(wsUrl);

      if (!connected) {
        throw new Error("Failed to establish connection");
      }

      // Save server config to localStorage
      localStorage.setItem("serverIp", serverIp);
      localStorage.setItem("serverPort", serverPort);

      // Wait a bit for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Send connect message with username
      sendMessage({ type: "connect", data: { name: userName } });

      // Wait for server to respond with player data
      // The useEffect above will call onConfirm when playerData is received

    } catch (err) {
      console.error("Failed to connect:", err);
      setError(`Failed to connect to ${wsUrl}. Please check the server address and try again.`);
      setIsConnecting(false);
    }
  };

  // Reset connecting state when playerData is received
  useEffect(() => {
    if (playerData) {
      setIsConnecting(false);
    }
  }, [playerData]);

  return (
    <div className="p-8 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center w-80">
      <h2 className="text-white text-2xl font-bold mb-4 text-center">
        Snake Game
        <p className="text-sm font-normal mt-2 text-gray-400">Enter Your Details</p>
      </h2>

      {/* Connection Status */}
      {isConnected && playerData && (
        <div className="w-full mb-2 p-2 bg-green-900 rounded text-green-400 text-sm text-center">
            Connected as {playerData.name} (ID: {playerData.id})
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="w-full mb-2 p-2 bg-red-900 rounded text-red-400 text-sm text-center">
          ERROR: {error}
        </div>
      )}

      {/* Username Input */}
      <div className="w-full mb-3">
        <label className="text-gray-400 text-sm mb-1 block">Your Name</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => {
            setUserName(e.target.value);
            setError(null);
          }}
          placeholder="Enter your name"
          className="w-full px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
          disabled={isConnecting}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isConnecting) {
              handleConfirm();
            }
          }}
        />
      </div>

      {/* Server IP Input */}
      <div className="w-full mb-3">
        <label className="text-gray-400 text-sm mb-1 block">Server IP</label>
        <input
          type="text"
          value={serverIp}
          onChange={(e) => {
            setServerIp(e.target.value);
            setError(null);
          }}
          placeholder="localhost or IP address"
          className="w-full px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
          disabled={isConnecting}
        />
      </div>

      {/* Server Port Input */}
      <div className="w-full mb-4">
        <label className="text-gray-400 text-sm mb-1 block">Server Port</label>
        <input
          type="text"
          value={serverPort}
          onChange={(e) => {
            setServerPort(e.target.value);
            setError(null);
          }}
          placeholder="8080"
          className="w-full px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
          disabled={isConnecting}
        />
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={isConnecting}
        className={`w-full px-4 py-2 text-white rounded-lg transition duration-200 active:scale-95 font-bold ${
          isConnecting
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {isConnecting ? "Connecting..." : "Connect & Start"}
      </button>

      <div className="mt-4 text-gray-400 text-xs text-center">
        <p>Default: ws://localhost:8080/ws</p>
      </div>
    </div>
  );
}
