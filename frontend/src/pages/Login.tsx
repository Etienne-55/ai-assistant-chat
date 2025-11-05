import { useState } from 'react';
import { LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  isLoading: boolean;
}

export const Login = ({ onLogin, isLoading }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tokyo-bg">
      <div className="bg-tokyo-bgHighlight p-8 rounded-lg shadow-2xl w-full max-w-md border border-tokyo-terminal">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-tokyo-purple/20 p-4 rounded-full">
            <LogIn className="w-12 h-12 text-tokyo-purple" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 text-tokyo-fg">
          Welcome Back
        </h1>
        <p className="text-tokyo-comment text-center mb-8">
          Sign in to your agentic assistant
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-tokyo-fgDark mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-tokyo-bgDark border border-tokyo-terminal rounded-lg 
                       text-tokyo-fg placeholder-tokyo-comment focus:outline-none focus:border-tokyo-blue
                       transition-colors"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-tokyo-fgDark mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-tokyo-bgDark border border-tokyo-terminal rounded-lg 
                       text-tokyo-fg placeholder-tokyo-comment focus:outline-none focus:border-tokyo-blue
                       transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-tokyo-purple hover:bg-tokyo-purple/80 text-white font-medium 
                     rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-tokyo-comment text-sm text-center mt-6">
          Mock authentication
        </p>
      </div>
    </div>
  );
};
