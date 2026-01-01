import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Navigate to="/Activity" replace />} />
          <Route path="/Activity" element={<Layout><Activity /></Layout>} />
          <Route path="/Posts" element={<Layout><Posts /></Layout>} />
          <Route path="/Leaderboard" element={<Layout><Leaderboard /></Layout>} />
          <Route path="/Rankings" element={<Layout><CategoryRankings /></Layout>} />
          <Route path="/Parties" element={<Layout><Parties /></Layout>} />
          <Route path="/Party" element={<Layout><Party /></Layout>} />
          <Route path="/Fraternity" element={<Layout><Fraternity /></Layout>} />
          <Route path="/Rate" element={<Navigate to="/Profile" replace />} />
          <Route path="/Profile" element={<Layout><Profile /></Layout>} />
          <Route path="/CreateParty" element={<Layout><CreateParty /></Layout>} />
          <Route path="/UserNotRegisteredError" element={<UserNotRegisteredError />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
