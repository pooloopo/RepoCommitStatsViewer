import { AuthProvider } from "./context/AuthContext";
import RepoListPage from "./pages/RepoListPage";
import DebtAuditPage from "./pages/DebtAuditPage";
import {
  BrowserRouter as Router,
  Navigate,
  Routes,
  Route,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RepoStatsPage from "./pages/RepoStatsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import CompareContributorsPage from "./pages/CompareContributorsPage";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/repos"
              element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <RepoListPage />
                  </ProtectedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/repo/:owner/:repoName"
              element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <RepoStatsPage />
                  </ProtectedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/repo/:owner/:repoName/audit"
              element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <DebtAuditPage />
                  </ProtectedLayout>
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/repos" replace />} />
            <Route
              path="/repo/:owner/:repoName/compare"
              element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <CompareContributorsPage />
                  </ProtectedLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
