import Dashboard from './components/Dashboard';
import './App.css';
import { AuthProvider, useAuth } from './lib/auth';
import Login from './components/Login';
import SupabaseConfig from './components/SupabaseConfig';

function AppInner() {
  const { session, configured } = useAuth();
  if (!configured) return <SupabaseConfig />;
  return <div className="App">{session ? <Dashboard /> : <Login />}</div>;
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
