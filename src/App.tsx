import { AuthProvider } from "./context/AuthContext"
import RepoListPage from "./pages/RepoListPage"
import DebtAuditPage from "./pages/DebtAuditPage";
import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import RepoStatsPage from "./pages/RepoStatsPage"
import ProtectedRoute from "./components/ProtectedRoute"
import ErrorBoundary from "./components/ErrorBoundary"
import Navbar from "./components/Navbar"

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
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
              element={<ProtectedRoute>
                  <ProtectedLayout>
                    <DebtAuditPage />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
            
            <Route path="/" element={<Navigate to="/repos" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

 /*<div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>*/
