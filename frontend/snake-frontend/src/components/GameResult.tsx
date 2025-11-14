import type { GameResultProps } from "../api/interface";

export default function GameResult({ score, onLeave }: GameResultProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="p-8 bg-gray-800 rounded-xl shadow-2xl flex flex-col items-center w-96 border-2 border-red-500">
        <div className="mb-6">
          <div className="text-6xl mb-4 text-center">💀</div>
          <h1 className="text-4xl font-bold text-center text-red-400 mb-2">
            Game Over
          </h1>
          <p className="text-gray-400 text-center text-sm">
            Your snake died!
          </p>
        </div>

        <div className="w-full bg-gray-700 rounded-lg p-6 mb-6 border border-gray-600">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-lg">Final Score</span>
            <span className="text-white font-bold text-3xl">{score}</span>
          </div>
        </div>

        <button
          onClick={onLeave}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold text-lg shadow-lg"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
