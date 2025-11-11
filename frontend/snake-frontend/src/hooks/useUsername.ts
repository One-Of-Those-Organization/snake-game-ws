import { useState } from "react";

export function useInputUserName() {
const [userName, setUserName] = useState(() => localStorage.getItem("userName") || "");
const [isFirstLogin, setIsFirstLogin] = useState(() => !localStorage.getItem("userName"));

  // Handle Save User Name (For now Local Storage)
  // Save the User ID here later when integrating with backend
  const saveUserName = () => {
    if (!isFirstLogin) return;

    const randomId = Math.floor(10000 + Math.random() * 90000).toString();

    if (userName.trim() !== "") {
      localStorage.setItem("userName", userName);
      localStorage.setItem("userId", randomId);
      setIsFirstLogin(false);
    }
  };

  const userSession = () => {
    const currentUserName = localStorage.getItem("userName");
    const sessionUserName = localStorage.getItem("userId");

    return Boolean(currentUserName && sessionUserName);
  }

  // Handle Delete User Name (Can be used for logout and switching accounts)
  // Delete the User ID here later when integrating with backend
  const deleteUserName = () => {
    localStorage.removeItem("userName");
    setUserName("");
    setIsFirstLogin(true);
  };

  return {userName, setUserName, isFirstLogin, saveUserName, userSession, deleteUserName};
}