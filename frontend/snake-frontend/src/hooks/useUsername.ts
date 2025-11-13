import { useState } from "react";

// Hook to Manage User Name Input and Session
export function useInputUserName() {
  const [userName, setUserName] = useState(
    () => localStorage.getItem("playerName") || ""
  );
  const [isFirstLogin, setIsFirstLogin] = useState(
    () => !localStorage.getItem("playerName")
  );

  // Save player data received from server
  const saveUserName = () => {
    // Check if player data exists in localStorage (set by WebSocketContext)
    const playerId = localStorage.getItem("playerId");
    const playerName = localStorage.getItem("playerName");
    const playerUniqueId = localStorage.getItem("playerUniqueId");

    if (playerId && playerName && playerUniqueId) {
      setIsFirstLogin(false);
      console.log("User session validated:", { playerId, playerName, playerUniqueId });
    }
  };

  // Check User Session Validity
  const userSession = () => {
    const playerId = localStorage.getItem("playerId");
    const playerName = localStorage.getItem("playerName");
    const playerUniqueId = localStorage.getItem("playerUniqueId");

    return Boolean(playerId && playerName && playerUniqueId);
  };

  // Handle Delete User Name (Logout)
  const deleteUserName = () => {
    localStorage.removeItem("playerId");
    localStorage.removeItem("playerName");
    localStorage.removeItem("playerUniqueId");
    localStorage.removeItem("serverIp");
    localStorage.removeItem("serverPort");
    setUserName("");
    setIsFirstLogin(true);
  };

  // Get stored player data for reconnection
  const getPlayerData = () => {
    const playerId = localStorage.getItem("playerId");
    const playerUniqueId = localStorage.getItem("playerUniqueId");

    if (playerId && playerUniqueId) {
      return {
        id: parseInt(playerId),
        unique_id: playerUniqueId,
      };
    }
    return null;
  };

  // Return necessary states and functions
  return {
    userName,
    setUserName,
    isFirstLogin,
    saveUserName,
    userSession,
    deleteUserName,
    getPlayerData,
  };
}
