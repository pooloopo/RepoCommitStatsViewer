import './App.css'
import Dashboard from './dashboard/Dashboard'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'
import { useClerk, useUser } from "@clerk/react";

function App() {
  const {openSignIn } = useClerk();
  
  return (
    //
    <>
      <header>
        <Show when="signed-out">
          {openSignIn()}
          
        </Show>
        <Show when="signed-in">
          
          <Dashboard />
        </Show>
      </header>
    </>
  )
}

export default App
