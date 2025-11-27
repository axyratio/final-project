import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getToken, deleteToken } from '@/utils/secure-store';
import {jwtDecode} from 'jwt-decode';
import { useRouter } from 'expo-router';

interface AuthContextProps {
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps>({ isAuthenticated: false, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkToken = async () => {
      const token = await getToken();
      if (token) {
        const { exp } = jwtDecode<{ exp: number }>(token);
        if (Date.now() >= exp * 1000) {
          await deleteToken();
          setIsAuthenticated(false);
          router.replace('/(auth)/login'); // redirect ถ้า token หมดอายุ
        } else {
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
        router.replace('/(auth)/login');
      }
      setLoading(false);
    };

    checkToken();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
