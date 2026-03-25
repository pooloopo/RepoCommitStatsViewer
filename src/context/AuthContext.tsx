import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, githubProvider } from '../firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
  GithubAuthProvider
} from 'firebase/auth';
import { Octokit } from 'octokit';
import { getGitHubUserData, setOctokit } from '../services/githubApi';

interface AuthContextType {
  user: User | null;
  githubUsername: string | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This runs every time `accessToken` changes
    setOctokit(new Octokit({
      auth: accessToken // My GitHub OAuth token from Firebase
    }));
  }, [accessToken]);

  useEffect(() => {
    const savedToken = localStorage.getItem('github_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        if (!accessToken && currentUser.providerData[0]?.providerId === 'github.com') {
          const credential = GithubAuthProvider.credentialFromResult(
            { user: currentUser } as any
          );
          if (credential?.accessToken) {
            localStorage.setItem('github_access_token', credential.accessToken);
            setAccessToken(credential.accessToken);
          }
        }
        //Use github UID to get commit authorship username (different from displayname)
        const username = (await getGitHubUserData(currentUser.providerData[0].uid as string)).login
        setGithubUsername(username || null);

      } else {
        setUser(null);
        setGithubUsername(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        localStorage.setItem('github_access_token', credential.accessToken);
        setAccessToken(credential.accessToken);
      }
      //Use github UID to get commit authorship username (different from displayname)
      const username = (await getGitHubUserData(auth.currentUser?.providerData[0].uid as string)).login
      setGithubUsername(username || null);
      setUser(result.user);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to sign in');
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      localStorage.removeItem('github_access_token');
      setUser(null);
      setGithubUsername(null);
      setAccessToken(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to sign out');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        githubUsername,
        accessToken,
        loading,
        error,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
