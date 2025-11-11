import { useState, useCallback } from "react";
import { useInputUserName } from "./useUsername";
import type { RoomData } from "../api/interface";

// Hook for Create some Room
export function useRoomLogic() {
  const { userName } = useInputUserName();
  const [rooms, setRooms] = useState<RoomData[]>([]);

  // Function Create New Room
  const createNewRoom = useCallback(() => {
    // Please replace this with actual how backend do
    const randomRoomId = Math.floor(10000 + Math.random() * 9000).toString();
    const newRoom: RoomData = {
      room_id: randomRoomId,
      room_name: `${userName}'s Room #`,
    };

    setRooms((prevRooms) => [...prevRooms, newRoom]);
  }, [userName]);

  // WIP Function Find Room By ID (For Join by Room ID)
  const findRoomById = (id: string): RoomData | undefined => {
    return rooms.find((room) => room.room_id === id);
  };

  // Return necessary states and functions
    // NOTE : If want to add some more, make sure to return (because i always almost forgot)
  return { rooms, createNewRoom, findRoomById };
}
