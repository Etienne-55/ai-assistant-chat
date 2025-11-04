import { useState } from 'react';

// Define User type here directly
interface User {
  id: string;
  email: string;
  name: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setUser({
      id: '1',
      email,
      name: email.split('@')[0],
    });
    
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
  };

  return { user, login, logout, isLoading };
};

// Export the types too
export type { User };
