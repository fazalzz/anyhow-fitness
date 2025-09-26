import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { FrontendUser as User } from '../types';
import * as api from '../apiClient';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
  token: string | null;
  login: (name: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (name: string, pin: string, phoneNumber: string) => Promise<{ success: boolean; error?: string }>;
  findUserByName: (name: string) => Promise<User | undefined>;
  updateUserPin: (userId: string, newPin: string) => Promise<void>;
  updateUser: (userId: string, updatedData: Partial<User>) => Promise<void>;
  changePin: (userId: string, currentPin: string, newPin: string) => Promise<{ success: boolean, error?: string }>;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));

  const isAuthenticated = () => {
    if (!token || !currentUser) return false;
    
    try {
      // Decode token to check expiration
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const isExpired = decoded.exp * 1000 < Date.now();
      
      if (isExpired) {
        logout();
        return false;
      }
      
      return true;
    } catch {
      logout();
      return false;
    }
  };

  // Restore user session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      
      if (storedToken) {
        try {
          setLoading(true);
          const result = await api.apiValidateToken();
          
          if (result.success && result.data) {
            setCurrentUser(result.data.user);
            setToken(storedToken);
            console.log('🔐 User session restored successfully');
          } else {
            // Token invalid, clean up
            logout();
          }
        } catch (error) {
          console.error('Error validating token:', error);
          logout();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Periodic token validation to keep sessions alive
  useEffect(() => {
    if (!token || !currentUser) return;
    
    const validatePeriodically = async () => {
      try {
        const result = await api.apiValidateToken();
        if (!result.success) {
          console.log('🔐 Session expired, please log in again');
          logout();
        }
      } catch (error) {
        console.error('Periodic validation failed:', error);
      }
    };

    // Validate every 10 minutes
    const interval = setInterval(validatePeriodically, 10 * 60 * 1000);

    // Also validate when user comes back from screen lock or tab switch
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        validatePeriodically();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, currentUser]);

  // Load users list when authenticated
  useEffect(() => {
    if (!isAuthenticated()) return;

    const loadUsers = async () => {
      try {
        setLoading(true);
        const result = await api.apiFetchUsers();
        if (result.success && result.data) {
          setUsers(result.data);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [token]);

  const login = async (name: string, pin: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.login(name, pin);
      
      if (result.success && result.data) {
        const { user, token } = result.data;
        if (!token) {
            throw new Error('No token received from server');
        }
        
        setCurrentUser(user);
        setToken(token);
        localStorage.setItem('authToken', token);
        return { success: true };
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear all auth state
      setCurrentUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      
      // Optional: Call logout endpoint to invalidate token on server
      await api.apiLogout().catch(console.error);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const register = async (name: string, pin: string, phoneNumber: string) => {
    try {
      setLoading(true);
      setError(null);

      // Validate inputs
      if (!name || !pin || !phoneNumber) {
        throw new Error('All fields are required');
      }

      if (pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }

      const result = await api.apiRegister(name, pin, phoneNumber);
      
      if (result.success && result.data) {
        const { user, token } = result.data;
        if (!user || !token) {
          throw new Error('Invalid response from server');
        }

        setUsers(prev => [...prev, user]);
        setCurrentUser(user);
        setToken(token);
        localStorage.setItem('authToken', token);
        return { success: true };
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during registration';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const findUserByName = async (name: string): Promise<User | undefined> => {
    try {
      const result = await api.apiFindUserByName(name);
      return result.success && result.data ? result.data : undefined;
    } catch (error) {
      console.error('Error finding user:', error);
      return undefined;
    }
  };

  const updateUserPin = async (userId: string, newPin: string) => {
    try {
      setLoading(true);
      const result = await api.apiUpdateUserPin(userId, newPin);
      
      if (result.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u } : u));
      } else {
        throw new Error(result.error || 'Failed to update PIN');
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updatedData: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);

      // Remove sensitive fields from update
      const { pin, ...safeUpdateData } = updatedData;
      
      const result = await api.apiUpdateUser(safeUpdateData);
      
      if (result.success && result.data) {
        const updatedUser = result.data;
        
        setUsers(prev => prev.map(u => 
          u.id === userId ? updatedUser : u
        ));
        
        if (currentUser?.id === userId) {
          setCurrentUser(updatedUser);
        }
      } else {
        throw new Error(result.error || 'Failed to update user');
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePin = async (userId: string, currentPin: string, newPin: string) => {
    try {
      if (!currentPin || !newPin) {
        throw new Error('Current and new PINs are required');
      }

      if (newPin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }

      setLoading(true);
      setError(null);

      const result = await api.apiChangePin(userId, currentPin, newPin);
      
      if (result.success) {
        // Don't store PIN in user object
        const userUpdate = currentUser && userId === currentUser.id 
          ? { ...currentUser }
          : undefined;

        if (userUpdate) {
          setCurrentUser(userUpdate);
          setUsers(prev => prev.map(u => u.id === userId ? userUpdate : u));
        }

        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to change PIN');
      }
    } catch (error: any) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      users, 
      loading, 
      error, 
      token,
      login, 
      logout, 
      register, 
      findUserByName, 
      updateUserPin, 
      updateUser, 
      changePin,
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
