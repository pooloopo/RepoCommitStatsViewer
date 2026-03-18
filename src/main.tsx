import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}
const localization = {
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Sign in to access the dashboard",
    },
  },
  formButtonPrimary: "Sign In",
  formFieldLabel__identifier: "Email address",
};
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}
     localization={localization}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
