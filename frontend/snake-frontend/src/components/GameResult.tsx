import type { GameResultProps } from "../api/interface";

export default function GameResult({ score, isWinner, onLeave }: GameResultProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="p-8 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center w-80">
        <h1 className={`text-3xl font-bold text-center mb-4 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
          {isWinner ? 'You Win!' : 'Game Over'}
        </h1>

        <div className="w-full bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Final Score</span>
            <span className="text-white font-bold text-xl">{score}</span>
          </div>
        </div>

        {/* Do we have some restart game ? */}
        {/* <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 ease-in-out active:scale-95 font-bold mb-4"
        >
          Rematch
        </button> */}

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