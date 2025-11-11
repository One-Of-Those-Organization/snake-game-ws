import { useInputUserName } from "../hooks/useUsername";

export default function MainMenu({ onQuit }: { onQuit: () => void }) {
const { userName } = useInputUserName();

  return (
    <div className="p-8 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center w-80">
      <h1 className="text-white text-2xl mb-4">Welcome, {userName}!</h1>

      {/* Title */}
      <h1 className="text-white text-3xl font-bold text-center mb-6">
        Snake Game
      </h1>

      {/* Create Room */}
      <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 ease-in-out active:scale-95 font-bold">
        Create Room
      </button>

      {/* Search Room */}
      <button className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 ease-in-out active:scale-95 font-bold">
        Search Room
      </button>

      {/* Quit Game */}
      <button
        onClick={onQuit}
        className="w-full mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 ease-in-out active:scale-95 font-bold"
      >
        Quit Game
      </button>
    </div>
  );
}
