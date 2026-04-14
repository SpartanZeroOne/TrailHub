import { AuthProvider } from './hooks/useAuth';
import OffroadEventsApp, { PasswordResetPage } from './OffroadEventsApp';
import AdminApp from './admin/AdminApp';

const path = window.location.pathname;

// Routing before AuthProvider:
// /admin/*  → Admin Dashboard (own auth gate)
// /reset-password → isolated password reset page
// all else  → main TrailHub App
export default function App() {
  if (path.startsWith('/admin')) {
    return <AdminApp />;
  }
  if (path.startsWith('/reset-password')) {
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