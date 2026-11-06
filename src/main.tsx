import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ConfirmarProvider } from './hooks/useConfirmar';
import './index.css';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <HashRouter>
        <ToastProvider>
          <ConfirmarProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ConfirmarProvider>
        </ToastProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
);
