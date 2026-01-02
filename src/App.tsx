import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
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
import Auth from "./pages/Auth";
import UserNotRegisteredError from "./components/errors/UserNotRegisteredError";
import NotFound from "./pages/NotFound";
import { checkStreakStatus } from "./utils/streak";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
