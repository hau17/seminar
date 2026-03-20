import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import App from "./App.tsx";
import { BusinessAuthProvider } from "./context/BusinessAuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BusinessAuthProvider>
      <App />
    </BusinessAuthProvider>
  </StrictMode>,
);
