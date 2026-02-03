import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Shortcut from "./pages/Shortcut";
import Stat from "./pages/Stat";
import Lotus from "./pages/Lotus";
import FiservBills from "./pages/FiservBills";
import Attendance from "./pages/Attendance";
import Storage from "./pages/Storage";
import Trends from "./pages/Trends";
import Salary from "./pages/Salary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/shortcut" element={<Shortcut />} />
          <Route path="/" element={<Index />} />
          <Route path="/stat" element={<Stat />} />
          <Route path="/lotus" element={<Lotus />} />
          <Route path="/fiserv-bills" element={<FiservBills />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/salary" element={<Salary />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
