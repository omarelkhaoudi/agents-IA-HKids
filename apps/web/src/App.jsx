import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import AdministrativeAssistantPage from './pages/AdministrativeAssistantPage';
import AiAdministrationPage from './pages/AiAdministrationPage';
import AdministrationLayout from './pages/administration/AdministrationLayout';
import AdminAgentsPage from './pages/administration/AdminAgentsPage';
import AdminDashboardPage from './pages/administration/AdminDashboardPage';
import AdminSettingsPage from './pages/administration/AdminSettingsPage';
import AdminStatisticsPage from './pages/administration/AdminStatisticsPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackDashboardPage from './pages/FeedbackDashboardPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import LoginPage from './pages/LoginPage';
import PromptBuilderPage from './pages/PromptBuilderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assistant" element={<AdministrativeAssistantPage />} />
        <Route path="/ai-administration" element={<AiAdministrationPage />} />
        <Route path="/administration" element={<AdministrationLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="agents" element={<AdminAgentsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="statistics" element={<AdminStatisticsPage />} />
        </Route>
        <Route path="/feedback-dashboard" element={<FeedbackDashboardPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/prompt-builder" element={<PromptBuilderPage />} />
      </Route>
    </Routes>
  );
}
