import './App.css'
import Dashboard from './dashboard/Dashboard'
import { useState } from 'react';
import { signInWithPopup, GithubAuthProvider, signOut } from 'firebase/auth';
import { auth, githubProvider } from './firebase';
import { SnackbarProvider } from 'notistack';


function App() {
  const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem('github_token'));
  const [user, setUser] = useState<any>(null);

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
        setUser(result.user);
        console.log("Successfully retrieved GitHub Token!");
      }
    } catch (error) {
      console.error("Error during sign in:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setGithubToken(null);
    setUser(null);
    localStorage.removeItem('github_token');
  };

  return (
    <div>
      <h1>GitPulse / RepoCommitStatsViewer</h1>
      {!githubToken ? (
        <button onClick={handleLogin}>Sign in with GitHub</button>
      ) : (
        <Dashboard />

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
