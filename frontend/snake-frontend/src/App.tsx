import { useInputUserName } from "./hooks/useUsername";
import NameInput from "./components/inputUsername";
import MainMenu from "./components/MainMenu";

export default function App() {
  const {
    userName,
    userSession,
    isFirstLogin,
    setUserName,
    saveUserName,
    deleteUserName,
  } = useInputUserName();

  const isValid = userSession();

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      {!isValid && isFirstLogin ? (
        <NameInput
          userName={userName}
          setUserName={setUserName}
          onConfirm={saveUserName}
        />
      ) : (
        <MainMenu onQuit={deleteUserName} />
      )}
    </div>
  );
}
