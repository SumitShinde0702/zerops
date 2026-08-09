import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AboutPage } from "./pages/AboutPage";
import { FromSlackPage } from "./pages/FromSlackPage";
import { HistoryPage } from "./pages/HistoryPage";
import { JoinPage } from "./pages/JoinPage";
import { LandingPage } from "./pages/LandingPage";
import { LobbyPage } from "./pages/LobbyPage";
import { NewRoomPage } from "./pages/NewRoomPage";
import { RoomPage } from "./pages/RoomPage";
import { TemplatesPage } from "./pages/TemplatesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<LobbyPage />} />
        <Route path="/app/new" element={<NewRoomPage />} />
        <Route path="/app/history" element={<HistoryPage />} />
        <Route path="/app/templates" element={<TemplatesPage />} />
        <Route path="/from-slack" element={<FromSlackPage />} />
        <Route path="/r/:id" element={<RoomPage />} />
        <Route path="/join/:id" element={<JoinPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
