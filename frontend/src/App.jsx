import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Dashboard pages
import DashboardPage from './pages/DashboardPage';
import ApisPage from './pages/ApisPage';
import ApiDetailPage from './pages/ApiDetailPage';
import KeysPage from './pages/KeysPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PlaygroundPage from './pages/PlaygroundPage';
import MarketplacePage from './pages/MarketplacePage';
import BillingPage from './pages/BillingPage';
import WebhooksPage from './pages/WebhooksPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/apis" element={<ApisPage />} />
        <Route path="/apis/:id" element={<ApiDetailPage />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
