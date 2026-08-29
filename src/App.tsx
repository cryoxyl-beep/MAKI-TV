import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import AnimeApp from "./AnimeApp";
import MoviesApp from "./MoviesApp";
import SeriesApp from "./SeriesApp";
import BoxdApp from "./boxd/BoxdApp";
import InviteRedirect from "./boxd/InviteRedirect";
import MaintenanceNotice from "./components/MaintenanceNotice";

export default function App() {
  return (
    <BrowserRouter>
      <MaintenanceNotice />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/anime/*" element={<AnimeApp />} />
        <Route path="/movies/*" element={<MoviesApp />} />
        <Route path="/series/*" element={<SeriesApp />} />
        <Route path="/boxd/*" element={<BoxdApp />} />
        <Route path="/invite/:inviteCode" element={<InviteRedirect />} />
        {/* Fallback to landing if not found top-level */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
