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
  room: string;
  room_name: string;
}

// Create Room Component
export interface CreateRoomProps {
  onBack: () => void;
  onStartGame: (roomId: string) => void;
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

// Game Result Component
export interface GameResultProps {
  score: number;
  onLeave: () => void;
}

export interface PlayerData {
    id: number;
    name: string;
    unique_id: string;
}

export interface WebSocketContextType {
    ws: WebSocket | null;
    isConnected: boolean;
    playerData: PlayerData | null;
    sendMessage: (message: any) => void;
    gameState: any;
    playerSnake: any;
    sendMove: (direction: number) => void;
    connect: (url: string) => Promise<boolean>;
    disconnect: () => void;
    reconnectFailed: boolean;
    clearReconnectFailed: () => void;
    createdRoom: any | null;
    joinError: string | null;
    clearJoinError: () => void;
    clearRoomState: () => void;
    deathData: any | null;
    clearDeathData: () => void;
}
