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
import CustosPage from "@/pages/CustosPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import LeadNotification from "@/components/LeadNotification";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, permissionKey }: { children: React.ReactNode; permissionKey?: string }) {
  const { session, permissions, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (permissionKey) {
    // Check if user has the required permission
    const hasPermission = (permissions as any)[permissionKey] === true;
    if (!hasPermission) return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// For gestor route: needs at least one gestor permission
function GestorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, permissions, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const hasAny = permissions.gestor_obras || permissions.gestor_clientes || permissions.gestor_materiais || permissions.gestor_equipamentos || permissions.gestor_custos;
  if (!hasAny) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}

function AuthRedirect() {
  const { session, profile, permissions, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (session && profile) {
    if (permissions.admin) return <Navigate to="/admin" replace />;
    if (permissions.gestor_obras || permissions.gestor_clientes) return <Navigate to="/gestor" replace />;
    if (permissions.calculadora) return <Navigate to="/orcamentos" replace />;
    return <Navigate to="/gestor" replace />;
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
            <Route path="/unauthorized" element={<div><SeoNoIndex /><UnauthorizedPage /></div>} />
            <Route path="/proposta/:id" element={<div><SeoNoIndex /><ProposalPage /></div>} />
            <Route path="/reset-password" element={<div><SeoNoIndex /><ResetPasswordPage /></div>} />
            <Route path="/orcamentos" element={
              <ProtectedRoute permissionKey="calculadora">
                <SeoNoIndex /><Layout><CalculatorPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute permissionKey="admin">
                <SeoNoIndex /><Layout><AdminPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/gestor" element={
              <GestorProtectedRoute>
                <SeoNoIndex /><Layout><GestorPage /></Layout>
              </GestorProtectedRoute>
            } />
            <Route path="/estoque" element={
              <ProtectedRoute permissionKey="estoque">
                <SeoNoIndex /><EstoquePage />
              </ProtectedRoute>
            } />
            <Route path="/custos" element={
              <ProtectedRoute permissionKey="gestor_custos">
                <SeoNoIndex /><Layout><CustosPage /></Layout>
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
