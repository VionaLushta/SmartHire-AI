import { Suspense, lazy } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationCenter from './components/ui/NotificationCenter';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoadingScreenPage from './pages/errors/LoadingScreenPage';

const AppRouter = lazy(() => import('./routes/AppRouter'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <Suspense fallback={<LoadingScreenPage />}>
            <AppRouter />
          </Suspense>
          <NotificationCenter />
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
