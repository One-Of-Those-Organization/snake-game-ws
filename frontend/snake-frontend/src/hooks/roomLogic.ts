import { useState, useCallback } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import type { RoomData } from "../api/interface";

// Hook for Create some Room
export function useRoomLogic() {
  const { createdRoom } = useWebSocketContext();
  const [rooms, setRooms] = useState<RoomData[]>([]);

  // Get room data from WebSocket context
  const getCurrentRoom = useCallback((): RoomData | null => {
    if (createdRoom) {
      return {
        room_id: createdRoom.id,  // Backend sends "id" field (UniqeID)
        room_name: `Room #${createdRoom.id}`,
      };
    }
    return null;
  }, [createdRoom]);

  // WIP Function Find Room By ID (For Join by Room ID)
  const findRoomById = (id: string): RoomData | undefined => {
    return rooms.find((room) => room.room_id === id);
  };

  return { rooms, getCurrentRoom, findRoomById };
}
