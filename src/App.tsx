import './App.css'
import Dashboard from './dashboard/Dashboard'
import { Show, SignIn, SignInButton, SignUpButton, UserButton } from '@clerk/react'
//import { useClerk, useUser } from "@clerk/react";
import { SnackbarProvider } from 'notistack';

function App() {
  //const {openSignIn } = useClerk();
  
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
}

export default App
