import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { OnboardingProvider } from './context/OnboardingContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import './utils/verifyStudyFlowHealth.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <OnboardingProvider>
        <App />
      </OnboardingProvider>
    </ErrorBoundary>
  </StrictMode>,
);
