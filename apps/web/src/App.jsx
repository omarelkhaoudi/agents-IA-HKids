import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppShell from './layouts/AppShell';
import AdministrativeAssistantPage from './pages/AdministrativeAssistantPage';
import AiAdministrationPage from './pages/AiAdministrationPage';
import AdministrationLayout from './pages/administration/AdministrationLayout';
import AdminAgentsPage from './pages/administration/AdminAgentsPage';
import AdminAiEvaluationPage from './pages/administration/AdminAiEvaluationPage';
import AdminDashboardPage from './pages/administration/AdminDashboardPage';
import AdminExportsPage from './pages/administration/AdminExportsPage';
import AdminObservabilityPage from './pages/administration/AdminObservabilityPage';
import AdminSettingsPage from './pages/administration/AdminSettingsPage';
import AdminStatisticsPage from './pages/administration/AdminStatisticsPage';
import AdminSystemStatusPage from './pages/administration/AdminSystemStatusPage';
import CommunityManagerPage from './pages/CommunityManagerPage';
import SalesAgentPage from './pages/SalesAgentPage';
import HrAgentPage from './pages/HrAgentPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackDashboardPage from './pages/FeedbackDashboardPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import DocumentsPage from './pages/DocumentsPage';
import LoginPage from './pages/LoginPage';
import PromptBuilderPage from './pages/PromptBuilderPage';
import SetupWizardPage from './pages/SetupWizardPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import { getSetupStatus } from './api/setup';

export default function App() {
  const [setupLoading, setSetupLoading] = useState(true);
  const [requiresSetup, setRequiresSetup] = useState(false);

  useEffect(() => {
    async function loadSetup() {
      try {
        const status = await getSetupStatus();
        setRequiresSetup(Boolean(status.requiresSetup));
      } catch {
        setRequiresSetup(false);
      } finally {
        setSetupLoading(false);
      }
    }

    void loadSetup();
  }, []);

  if (setupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading platform...
      </div>
    );
  }

  if (requiresSetup) {
    return (
      <SetupWizardPage
        onCompleted={() => {
          setRequiresSetup(false);
        }}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupWizardPage onCompleted={() => setRequiresSetup(false)} />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/community-manager" element={<CommunityManagerPage />} />
          <Route path="/sales-agent" element={<SalesAgentPage />} />
          <Route path="/hr-agent" element={<HrAgentPage />} />
          <Route path="/assistant" element={<AdministrativeAssistantPage />} />
          <Route path="/feedback-dashboard" element={<FeedbackDashboardPage />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/prompt-builder" element={<PromptBuilderPage />} />
          <Route element={<ProtectedRoute minRole="manager" />}>
            <Route path="/ai-administration" element={<AiAdministrationPage />} />
            <Route path="/administration" element={<AdministrationLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="observability" element={<AdminObservabilityPage />} />
              <Route path="evaluation" element={<AdminAiEvaluationPage />} />
              <Route path="system-status" element={<AdminSystemStatusPage />} />
              <Route path="exports" element={<AdminExportsPage />} />
              <Route path="agents" element={<AdminAgentsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="statistics" element={<AdminStatisticsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
