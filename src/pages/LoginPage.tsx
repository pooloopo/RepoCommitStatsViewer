import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Loader as Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, error, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/repos');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login();
    } catch {
      console.error('Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GitHubLogoIcon className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Repo Commit Stats Viewer
          </h1>
          <p className="text-muted-foreground">
            Track and analyze your GitHub repository contributions
          </p>
        </div>

        {error && (
          <Alert className="border-red-900/50 bg-red-950/30 text-red-200 mb-6">
            <p>{error}</p>
          </Alert>
        )}

        <Button
          onClick={handleLogin}
          disabled={loading || isLoggingIn}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 mb-4"
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <GitHubLogoIcon className="w-4 h-4 mr-2" />
              Sign in with GitHub
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
