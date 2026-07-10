import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { WalletProvider } from './context/WalletContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <WalletProvider>
        <SocketProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </SocketProvider>
      </WalletProvider>
    </AuthProvider>
  </StrictMode>,
)
