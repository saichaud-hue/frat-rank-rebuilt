import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Leaderboard from "./pages/Leaderboard";
import Parties from "./pages/Parties";
import Party from "./pages/Party";
import Fraternity from "./pages/Fraternity";
import Rate from "./pages/Rate";
import Profile from "./pages/Profile";
import CreateParty from "./pages/CreateParty";
import UserNotRegisteredError from "./components/errors/UserNotRegisteredError";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/Leaderboard" replace />} />
          <Route path="/Leaderboard" element={<Layout><Leaderboard /></Layout>} />
          <Route path="/Parties" element={<Layout><Parties /></Layout>} />
          <Route path="/Party" element={<Layout><Party /></Layout>} />
          <Route path="/Fraternity" element={<Layout><Fraternity /></Layout>} />
          <Route path="/Rate" element={<Layout><Rate /></Layout>} />
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
