import './App.css'
import Dashboard from './dashboard/Dashboard'
import Header from './dashboard/components/Header'
import { useState } from 'react';
import { signInWithPopup, GithubAuthProvider, signOut } from 'firebase/auth';
import { auth, githubProvider } from './firebase';
import { SnackbarProvider } from 'notistack';
import AppTheme from './shared-theme/AppTheme';
import RepoListPage from './pages/RepoListPage'
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from './dashboard/theme/customizations';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};


function App() {
  const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem('github_token'));

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      
      // This gives you a GitHub Access Token. You can use it to access the GitHub API.
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        // Save the token to state and localStorage so it persists after a refresh
        setGithubToken(token);
        localStorage.setItem('github_token', token);
        console.log("Successfully retrieved GitHub Token!");
      }
    } catch (error) {
      console.error("Error during sign in:", error);
    }
  };

  return (
    <div>
      <h1>GitPulse / RepoCommitStatsViewer</h1>
      {!githubToken ? (
        <button onClick={handleLogin}>Sign in with GitHub</button>
      ) : (
        <RepoListPage />


      )}
    </div>
  );
}


/*function App() {  
  return (
    //
    <SnackbarProvider maxSnack={3}>
      <header>
        <Show when="signed-out">
          <SignIn
            routing="hash"


            withSignUp={true}
            appearance={{
              elements: {
                card: "shadow-xl"
              }
            }}
          />
          
          
        </Show>
        <Show when="signed-in">
          
          <Dashboard />
        </Show>
      </header>
    </SnackbarProvider>
  )
}*/

export default App
