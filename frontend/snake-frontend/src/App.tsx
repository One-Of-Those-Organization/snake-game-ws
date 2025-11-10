import { useState } from "react";

export default function App() {
  // const [isFirstLogin, setIsFirstLogin] = useState(true);
  // const [userName, setUserName] = useState("");

  // Get userName from localStorage if exists
  const [userName, setUserName] = useState(
    () => localStorage.getItem("userName") || ""
  );

  // Bool to check if first login
  const [isFirstLogin, setIsFirstLogin] = useState(
    () => !localStorage.getItem("userName")
  );

  // Handle input user name
  const handleInputUserName = () => {
    if (!isFirstLogin) return;

    if (userName.trim() !== "") {
      localStorage.setItem("userName", userName);
      setIsFirstLogin(false);
    }
  };

  // Handle Quit Game
  const handleQuitGame = () => {
    localStorage.removeItem("userName");
    setUserName("");
    setIsFirstLogin(true);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      {isFirstLogin ? (
        // Popout input name
        <div className="p-8 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center w-80">
          <h2 className="text-white text-2xl font-bold mb-4 text-center">
            Enter Your Name
          </h2>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400 mb-4"
          />
          <button
            onClick={handleInputUserName}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 active:scale-95 font-bold"
          >
            Start
          </button>
        </div>
      ) : (
        // Main Menu
        <div className="p-8 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center w-80">
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
            onClick={handleQuitGame}
            className="w-full mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 ease-in-out active:scale-95 font-bold"
          >
            Quit Game
          </button>
        </div>
      )}
    </div>
  );
}
