import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import AnimeApp from "./AnimeApp";
import MoviesApp from "./MoviesApp";
import SeriesApp from "./SeriesApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/anime/*" element={<AnimeApp />} />
        <Route path="/movies/*" element={<MoviesApp />} />
        <Route path="/series/*" element={<SeriesApp />} />
        {/* Fallback to landing if not found top-level */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
