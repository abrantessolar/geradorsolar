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
import FerramentasPage from "@/pages/FerramentasPage";
import Ren1000Page from "@/pages/Ren1000Page";
import ClientesPage from "@/pages/ClientesPage";
import RastreamentoPage from "@/pages/RastreamentoPage";
import FaqPage from "@/pages/FaqPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import LeadNotification from "@/components/LeadNotification";
import NotFound from "@/pages/NotFound";
import { EnergiaProvider } from "@/contexts/EnergiaContext";
import EnergiaLogin from "@/pages/energia/EnergiaLogin";
import EnergiaCadastro from "@/pages/energia/EnergiaCadastro";
import EnergiaDashboard from "@/pages/energia/EnergiaDashboard";
import EnergiaTrilha from "@/pages/energia/EnergiaTrilha";
import EnergiaPremios from "@/pages/energia/EnergiaPremios";
import EnergiaIndicacoes from "@/pages/energia/EnergiaIndicacoes";
import EnergiaRanking from "@/pages/energia/EnergiaRanking";
import EnergiaCaptarIndicacao from "@/pages/energia/EnergiaCaptarIndicacao";
import EnergiaAdminLogin from "@/pages/energia/admin/EnergiaAdminLogin";
import EnergiaAdminVisaoGeral from "@/pages/energia/admin/EnergiaAdminVisaoGeral";
import EnergiaAdminPremios from "@/pages/energia/admin/EnergiaAdminPremios";
import EnergiaAdminTrilha from "@/pages/energia/admin/EnergiaAdminTrilha";
import EnergiaAdminPontuacao from "@/pages/energia/admin/EnergiaAdminPontuacao";
import EnergiaAdminClientes from "@/pages/energia/admin/EnergiaAdminClientes";
import EnergiaAdminIndicacoes from "@/pages/energia/admin/EnergiaAdminIndicacoes";
import EnergiaAdminResgates from "@/pages/energia/admin/EnergiaAdminResgates";
import EnergiaAdminConfiguracoes from "@/pages/energia/admin/EnergiaAdminConfiguracoes";

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
    if (permissions.gestor_obras || permissions.gestor_clientes) return <Navigate to="/clientes" replace />;
    if (permissions.calculadora) return <Navigate to="/orcamentos" replace />;
    return <Navigate to="/clientes" replace />;
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
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/login" element={<AuthRedirect />} />
            <Route path="/unauthorized" element={<div><SeoNoIndex /><UnauthorizedPage /></div>} />
            <Route path="/proposta/:id" element={<div><SeoNoIndex /><ProposalPage /></div>} />
            <Route path="/reset-password" element={<div><SeoNoIndex /><ResetPasswordPage /></div>} />
            <Route path="/acompanhar/:codigo" element={<div><SeoNoIndex /><RastreamentoPage /></div>} />
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
            <Route path="/gestor" element={<Navigate to="/clientes" replace />} />
            <Route path="/estoque" element={
              <ProtectedRoute permissionKey="estoque">
                <SeoNoIndex /><EstoquePage />
              </ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <GestorProtectedRoute>
                <SeoNoIndex /><Layout><ClientesPage /></Layout>
              </GestorProtectedRoute>
            } />
            <Route path="/custos" element={
              <ProtectedRoute permissionKey="gestor_custos">
                <SeoNoIndex /><Layout><CustosPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/ferramentas" element={
              <ProtectedRoute>
                <SeoNoIndex /><Layout><FerramentasPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/ferramentas/ren1000" element={
              <ProtectedRoute>
                <SeoNoIndex /><Layout><Ren1000Page /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/energia" element={<div><SeoNoIndex /><EnergiaProvider><EnergiaLogin /></EnergiaProvider></div>} />
            <Route path="/energia/cadastro" element={<div><SeoNoIndex /><EnergiaProvider><EnergiaCadastro /></EnergiaProvider></div>} />

            <Route path="/energia/dashboard" element={<div><SeoNoIndex /><EnergiaProvider><EnergiaDashboard /></EnergiaProvider></div>} />
            <Route path="/energia/trilha" element={<div><SeoNoIndex /><EnergiaProvider><EnergiaTrilha /></EnergiaProvider></div>} />
            <Route path="/energia/premios" element={<div><SeoNoIndex /><EnergiaProvider><EnergiaPremios /></EnergiaProvider></div>} />
            <Route path="/energia/indicacoes" element={<div><SeoNoIndex /><EnergiaProvider><EnergiaIndicacoes /></EnergiaProvider></div>} />
            <Route path="/energia/ranking" element={<div><SeoNoIndex /><EnergiaProvider><EnergiaRanking /></EnergiaProvider></div>} />
            <Route path="/energia/i/:codigo" element={<div><SeoNoIndex /><EnergiaCaptarIndicacao /></div>} />
            <Route path="/energia/admin/login" element={<div><SeoNoIndex /><EnergiaAdminLogin /></div>} />
            <Route path="/energia/admin" element={<div><SeoNoIndex /><EnergiaAdminVisaoGeral /></div>} />
            <Route path="/energia/admin/premios" element={<div><SeoNoIndex /><EnergiaAdminPremios /></div>} />
            <Route path="/energia/admin/trilha" element={<div><SeoNoIndex /><EnergiaAdminTrilha /></div>} />
            <Route path="/energia/admin/pontuacao" element={<div><SeoNoIndex /><EnergiaAdminPontuacao /></div>} />
            <Route path="/energia/admin/clientes" element={<div><SeoNoIndex /><EnergiaAdminClientes /></div>} />
            <Route path="/energia/admin/indicacoes" element={<div><SeoNoIndex /><EnergiaAdminIndicacoes /></div>} />
            <Route path="/energia/admin/resgates" element={<div><SeoNoIndex /><EnergiaAdminResgates /></div>} />
            <Route path="/energia/admin/configuracoes" element={<div><SeoNoIndex /><EnergiaAdminConfiguracoes /></div>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
