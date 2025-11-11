// All Interfaces Data Used in Frontend

export interface MainMenuProps {
  onQuit: () => void;
  onCreateRoom: () => void;
  onFindRoom: () => void;
}

// For User Data -> Sorry, UserLogin because this doen't save the ID
export interface UserData {
  userName: string;
  setUserName: (name: string) => void;
  onConfirm: (name: string) => void;
}

// For Room Data
export interface RoomData {
  room_id: string;
  room_name: string;
}

// Create Room Component
export interface CreateRoomProps {
  rooms: RoomData[];
  onBack: () => void;
  onStartGame: () => void;
}

// Find Room Component
export interface FindRoomProps {
  onBack: () => void;
  onJoinGame: (roomId: string) => void;
}

// Snake Canvas Component
export interface SnakeCanvasProps {
  roomId: string;
  playerName: string;
  onBack: () => void;
}

// Game Menu Component
export interface GameMenuProps {
  onLeave: () => void;
}