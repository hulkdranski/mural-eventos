
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { observeAuth, logout } from "./services/authService";
import { checkAdmin } from "./services/adminService";

import { useLocation } from "react-router-dom";

import ModerationPage from "./pages/ModerationPage";
import LoginPage from "./pages/LoginPage";
import EventPage from "./pages/EventPage";
import UploadPage from "./pages/UploadPage";
import SlideshowPage from "./pages/SlideshowPage";


function AdminAccess() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = observeAuth(async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const authorized = await checkAdmin(currentUser.uid);
        setIsAdmin(authorized);
      } catch (error) {
        console.error("Erro ao verificar administrador:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Verificando acesso...</p>;
  if (!user) return <LoginPage />;

  if (!isAdmin) {
    return (
      <main>
        <h1>Acesso não autorizado</h1>
        <button onClick={logout}>Sair</button>
      </main>
    );
  }

  if (location.pathname.startsWith("/moderacao/")) {
  return <ModerationPage />;
}

return <EventPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminAccess />} />
        <Route path="/evento/:eventId" element={<UploadPage />} />
        <Route path="/moderacao/:eventId" element={<AdminAccess />} />
        <Route path="/slideshow/:eventId" element={<SlideshowPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
