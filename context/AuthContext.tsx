import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { FrontendUser as User } from '../types';
import * as api from '../apiClient';

type LoginResult =
  | { success: true }
  | { success: false; error: string }
  | { success: true; requiresTwoFactor: true; twoFactorToken: string; email: string; message?: string };

type VerifyTwoFactorResult = { success: boolean; error?: string };
type ResendTwoFactorResult = { success: boolean; twoFactorToken?: string; error?: string; email?: string };

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
  token: string | null;
  login: (name: string, pin: string, identifierOverride?: string) => Promise<LoginResult>;
  verifyTwoFactor: (token: string, code: string) => Promise<VerifyTwoFactorResult>;
  resendTwoFactor: (token: string) => Promise<ResendTwoFactorResult>;
  logout: () => void;
  register: (name: string, pin: string, email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  requestResetCode: (identifier: string) => Promise<{ success: boolean; error?: string; verificationCode?: string }>;
  resetPin: (identifier: string, code: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
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
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));

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
      const storedToken = localStorage.getItem('accessToken');
      
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

  const login = async (name: string, pin: string, identifierOverride?: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.login(name, pin, identifierOverride);

      if (result.success && result.data) {
        const data = result.data as any;
        if (data.twoFactorRequired) {
          return {
            success: true as const,
            requiresTwoFactor: true as const,
            twoFactorToken: data.twoFactorToken as string,
            email: data.email as string,
            message: data.message as string | undefined,
          };
        }

        const { user, accessToken, refreshToken } = data;
        if (!accessToken) {
          throw new Error('No access token received from server');
        }

        setCurrentUser(user);
        setToken(accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        return { success: true as const };
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during login';
      setError(errorMessage);
      return { success: false as const, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  
const verifyTwoFactor = async (twoFactorToken: string, code: string): Promise<VerifyTwoFactorResult> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.apiVerifyTwoFactor(twoFactorToken, code);

      if (result.success && result.data) {
        const { user, accessToken, refreshToken } = result.data;
        if (!accessToken) {
          throw new Error('No access token received from server');
        }
        setCurrentUser(user);
        setToken(accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        return { success: true };
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to verify two-factor code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resendTwoFactor = async (twoFactorToken: string): Promise<ResendTwoFactorResult> => {
    try {
      setError(null);
      const result = await api.apiResendTwoFactor(twoFactorToken);
      if (result.success && result.data) {
        return { success: true, twoFactorToken: result.data.twoFactorToken, email: result.data.email };
      }
      throw new Error(result.error || 'Unable to resend verification code');
    } catch (error: any) {
      const errorMessage = error.message || 'Unable to resend verification code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Clear all auth state
      setCurrentUser(null);
      setToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Optional: Call logout endpoint to invalidate token on server
      await api.apiLogout().catch(console.error);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const register = async (name: string, pin: string, email: string) => {
    try {
      setLoading(true);
      setError(null);

      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedName || !pin || !trimmedEmail) {
        throw new Error('All fields are required');
      }

      if (!trimmedEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }

  const result = await api.apiRegister(trimmedName, pin, trimmedEmail);
      
      if (result.success && result.data) {
        const { user, accessToken } = result.data;
        if (!user || !accessToken) {
          throw new Error('Invalid response from server');
        }

        setUsers(prev => [...prev, user]);
        setCurrentUser(user);
        setToken(accessToken);
        if (result.data.refreshToken) {
          localStorage.setItem('refreshToken', result.data.refreshToken);
        }
        return { success: true };
      } else {
        // If user already exists (409 error), try to login instead
        if (result.status === 409) {
          console.log('Auto-login retry: user already exists. Attempting to sign in...');
          try {
            // First try login with name + pin
            let loginResult = await login(trimmedName, pin);
            if (loginResult.success) {
              if ((loginResult as any).requiresTwoFactor) {
                console.log('Auto-login requires two-factor verification.');
                return { success: true, message: 'User already exists - please verify your login via the emailed code.' };
              }
              console.log('Auto-login successful.');
              return { success: true, message: 'User already exists - logged in successfully!' };
            }
            // If that failed, try with email identifier
            console.log('Auto-login fallback: retrying with email.');
            loginResult = await login(trimmedName, pin, trimmedEmail);
            if (loginResult.success) {
              if ((loginResult as any).requiresTwoFactor) {
                console.log('Auto-login via email requires two-factor verification.');
                return { success: true, message: 'Please verify your login via the emailed code.' };
              }
              console.log('Auto-login via email succeeded.');
              return { success: true, message: 'Logged in successfully!' };
            }
            throw new Error('User already exists but login failed. Please check your PIN.');
          } catch (loginError) {
            console.error('Auto-login failed:', loginError);
            throw new Error('User already exists but login failed. Please check your PIN.');
          }
        }
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

  const requestResetCode = async (identifier: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!identifier) {
        throw new Error('Identifier is required');
      }

      const result = await api.apiRequestResetCode(identifier);

      if (result.success) {
        return { success: true, verificationCode: result.data?.verificationCode };
      }

      throw new Error(result.error || 'Failed to send reset code');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resetPin = async (identifier: string, code: string, newPin: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!identifier || !code || !newPin) {
        throw new Error('All fields are required');
      }

      if (newPin.length !== 8 || !/^\d+$/.test(newPin)) {
        throw new Error('PIN must be 8 digits');
      }

      const result = await api.apiResetPin(identifier, code, newPin);

      if (result.success) {
        return { success: true };
      }

      throw new Error(result.error || 'Failed to reset PIN');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reset PIN';
      setError(errorMessage);
      return { success: false, error: errorMessage };
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
      verifyTwoFactor,
      resendTwoFactor,
      logout, 
      register, 
      findUserByName, 
      updateUserPin, 
      updateUser, 
      changePin,
      requestResetCode,
      resetPin,
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
