import { AuthProvider } from './hooks/useAuth';
import OffroadEventsApp, { PasswordResetPage } from './OffroadEventsApp';

// Routing vor dem Auth-Kontext: /reset-password bekommt eigene isolierte Seite
const isResetRoute = window.location.pathname.startsWith('/reset-password');

export default function App() {
  if (isResetRoute) {
    return (
      <PasswordResetPage onDone={() => { window.location.href = '/'; }} />
    );
  }
  return (
    <AuthProvider>
      <OffroadEventsApp />
    </AuthProvider>
  );
}