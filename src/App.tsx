import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import Layout from "./components/Layout";
import Activity from "./pages/Activity";
import Posts from "./pages/Posts";
import Leaderboard from "./pages/Leaderboard";
import CategoryRankings from "./pages/CategoryRankings";
import Parties from "./pages/Parties";
import Party from "./pages/Party";
import Fraternity from "./pages/Fraternity";
import Profile from "./pages/Profile";
import CreateParty from "./pages/CreateParty";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import UserNotRegisteredError from "./components/errors/UserNotRegisteredError";
import NotFound from "./pages/NotFound";
import { checkStreakStatus } from "./utils/streak";
import { SemesterAnnouncementPopup } from "./components/announcements/SemesterAnnouncementPopup";
import { NewPartiesNotification } from "./components/notifications/NewPartiesNotification";

const queryClient = new QueryClient();

// Check streak status on app load
checkStreakStatus();

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Safety: if an overlay leaves the app "frozen" (pointer-events:none), restore interactivity
const PointerEventsSafety = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const fix = () => {
      const bodyPE = window.getComputedStyle(document.body).pointerEvents;
      const htmlPE = window.getComputedStyle(document.documentElement).pointerEvents;

      if (bodyPE === 'none' || document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = 'auto';
      }
      if (htmlPE === 'none' || document.documentElement.style.pointerEvents === 'none') {
        document.documentElement.style.pointerEvents = 'auto';
      }

      // Sometimes children or inert attribute can block interactions
      Array.from(document.body.children).forEach((el) => {
        const h = el as HTMLElement;
        if (h.style.pointerEvents === 'none') h.style.pointerEvents = 'auto';
        if (h.hasAttribute('inert')) h.removeAttribute('inert');
      });
    };

    // Run immediately + a few times after route changes
    fix();
    const id = window.setInterval(fix, 400);
    const timeout = window.setTimeout(() => window.clearInterval(id), 4000);

    const onFocus = () => fix();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(timeout);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [pathname]);

  return null;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash once per session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <Toaster />
          <Sonner />
          <SemesterAnnouncementPopup />
          <BrowserRouter>
            <NewPartiesNotification />
            <ScrollToTop />
            <PointerEventsSafety />
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<Navigate to="/Activity" replace />} />
              <Route path="/UserNotRegisteredError" element={<UserNotRegisteredError />} />
              
              {/* Protected routes */}
              <Route path="/" element={<Navigate to="/Activity" replace />} />
              <Route path="/Activity" element={
                <ProtectedRoute>
                  <Layout><Activity /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Posts" element={
                <ProtectedRoute>
                  <Layout><Posts /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Leaderboard" element={
                <ProtectedRoute>
                  <Layout><Leaderboard /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Rankings" element={
                <ProtectedRoute>
                  <Layout><CategoryRankings /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Parties" element={
                <ProtectedRoute>
                  <Layout><Parties /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Party" element={
                <ProtectedRoute>
                  <Layout><Party /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Fraternity/:id" element={
                <ProtectedRoute>
                  <Layout><Fraternity /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Rate" element={<Navigate to="/Profile" replace />} />
              <Route path="/Profile" element={
                <ProtectedRoute>
                  <Layout><Profile /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/CreateParty" element={
                <ProtectedRoute>
                  <Layout><CreateParty /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/Admin" element={
                <AdminRoute>
                  <Layout><Admin /></Layout>
                </AdminRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
