import { createRoot } from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./index.css";
import App from "./App";

// Root rendering with React Router
createRoot(document.getElementById("root")!).render(
  <Router>
    <Routes>
      {/* Default page */}
      <Route path="/" element={<App />} />

      {/* Redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);
