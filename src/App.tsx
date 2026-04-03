import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import SeoNoIndex from "@/components/SeoNoIndex";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import CalculatorPage from "@/pages/CalculatorPage";
import AdminPage from "@/pages/AdminPage";
import ProposalPage from "@/pages/ProposalPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import GestorPage from "@/pages/GestorPage";
import EstoquePage from "@/pages/EstoquePage";
import LeadNotification from "@/components/LeadNotification";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (session && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'gestor') return <Navigate to="/gestor" replace />;
    return <Navigate to="/orcamentos" replace />;
  }

  return <LoginPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LeadNotification />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthRedirect />} />
            <Route path="/proposta/:id" element={<div><SeoNoIndex /><ProposalPage /></div>} />
            <Route path="/reset-password" element={<div><SeoNoIndex /><ResetPasswordPage /></div>} />
            <Route path="/orcamentos" element={
              <ProtectedRoute allowedRoles={['admin', 'orcamentista', 'vendedor']}>
                <SeoNoIndex /><Layout><CalculatorPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin', 'orcamentista', 'vendedor']}>
                <SeoNoIndex /><Layout><AdminPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/gestor" element={
              <ProtectedRoute>
                <SeoNoIndex /><Layout><GestorPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
