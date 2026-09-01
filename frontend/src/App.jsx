import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationCenter from './components/ui/NotificationCenter';
import ErrorBoundary from './components/ui/ErrorBoundary';
import AppRouter from './routes/AppRouter';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AppRouter />
          <NotificationCenter />
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
