import type { GameMenuProps } from "../api/interface";

export default function GameMenu({ onLeave }: GameMenuProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="p-8 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center w-80">
        <h1 className="text-white text-3xl font-bold text-center mb-6">
          Snake Game WS
        </h1>

        <button
          onClick={onLeave}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 ease-in-out active:scale-95 font-bold"
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}
