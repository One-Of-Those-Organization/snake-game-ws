export default function NameInput({
  userName,
  setUserName,
  onConfirm,
}: {
  userName: string;
  setUserName: (name: string) => void;
  onConfirm: (name: string) => void;
}) {
  return (
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
        onClick={() => onConfirm(userName)}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 active:scale-95 font-bold"
      >
        Start
      </button>
    </div>
  );
}
