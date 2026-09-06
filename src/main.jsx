import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import './index.css';
import './styles/tokens.css';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Outside the providers on purpose: the crash that took the site down on
        2026-09-06 was thrown inside AppProvider itself, so a boundary nested
        within it would have gone down with it. */}
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
