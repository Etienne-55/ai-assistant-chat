import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Chat } from './pages/Chat';

function App() {
  const { user, login, logout, isLoading } = useAuth();

  if (!user) {
    return <Login onLogin={login} isLoading={isLoading} />;
  }

  return <Chat user={user} onLogout={logout} />;
}

export default App;
