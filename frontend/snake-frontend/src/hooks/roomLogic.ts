import { useCallback } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import type { RoomData } from "../api/interface";

// Hook for Create some Room
export function useRoomLogic() {
  const { createdRoom } = useWebSocketContext();

  // Get room data from WebSocket context
  const getCurrentRoom = useCallback((): RoomData | null => {
    if (createdRoom) {
      return {
        room_id: createdRoom.id,
        room_name: `Room #${createdRoom.id}`,
      };
    }
    return null;
  }, [createdRoom]);

  return { getCurrentRoom };
}
