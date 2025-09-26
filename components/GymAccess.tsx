import React, { useState, useEffect } from 'react';
import { BackButton } from './common';
import { useAuth } from '../context/AuthContext';
import { 
  apiArkkiesLogin, 
  apiArkkiesSessionStatus, 
  apiArkkiesOutlets,
  apiArkkiesBookAndAccess
} from '../apiClient';

interface ArkkiesCredentials {
  email: string;
  password: string;
}

interface GymOutlet {
  id: string;
  name: string;
  location: string;
}

const GymAccess: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [, setSessionInfo] = useState<any>(null);
  const [showConnectedPopup, setShowConnectedPopup] = useState(false);

  // Form state
  const [credentials, setCredentials] = useState<ArkkiesCredentials>({
    email: '',
    password: ''
  });
  const [targetOutlet, setTargetOutlet] = useState('');

  // Real Arkkies gym outlets
  const [outlets, setOutlets] = useState<GymOutlet[]>([
    { id: 'AGRBGK01', name: 'Arkkies Buangkok', location: 'Buangkok' },
    { id: 'AGRSRN01', name: 'Arkkies Serangoon North', location: 'Serangoon North' },
    { id: 'AGRJUR01', name: 'Arkkies Jurong East', location: 'Jurong East' },
    { id: 'AGRTPE01', name: 'Arkkies Toa Payoh East', location: 'Toa Payoh East' }
  ]);

  // Check for existing Arkkies session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      // Check local cache first for instant response
      const cachedSession = localStorage.getItem(`arkkies_session_${currentUser?.id}`);
      if (cachedSession) {
        try {
          const sessionData = JSON.parse(cachedSession);
          // Check if cached session is less than 5 minutes old
          const cacheAge = Date.now() - sessionData.timestamp;
          if (cacheAge < 5 * 60 * 1000) { // 5 minutes
            setIsLoggedIn(true);
            setSessionInfo(sessionData.data);
            setShowConnectedPopup(true);
            setIsCheckingSession(false);
            return;
          }
        } catch (e) {
          // Invalid cache, continue with API call
        }
      }

      setIsCheckingSession(true);
      try {
        const response = await apiArkkiesSessionStatus();
        
        if (response.success && response.data) {
          setIsLoggedIn(true);
          setSessionInfo(response.data);
          setShowConnectedPopup(true);
          
          // Cache the session for 5 minutes
          localStorage.setItem(`arkkies_session_${currentUser?.id}`, JSON.stringify({
            data: response.data,
            timestamp: Date.now()
          }));
          
          // Load outlets from API
          try {
            const outletsResponse = await apiArkkiesOutlets();
            if (outletsResponse.success && outletsResponse.data) {
              setOutlets(outletsResponse.data);
            }
          } catch (err) {
            console.error('Failed to load outlets:', err);
          }
        } else {
          setIsLoggedIn(false);
          // Clear any stale cache
          localStorage.removeItem(`arkkies_session_${currentUser?.id}`);
        }
      } catch (error) {
        console.error('Failed to check session status:', error);
        setIsLoggedIn(false);
        localStorage.removeItem(`arkkies_session_${currentUser?.id}`);
      } finally {
        setIsCheckingSession(false);
      }
    };

    if (token && currentUser) {
      checkExistingSession();
    } else {
      setIsCheckingSession(false);
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiArkkiesLogin(credentials);
      
      if (response.success) {
        setIsLoggedIn(true);
        setSessionInfo(response.data);
        setSuccess('Successfully connected to Arkkies!');
        
        // Cache the fresh session
        localStorage.setItem(`arkkies_session_${currentUser?.id}`, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
        
        // Load outlets from API
        try {
          const outletsResponse = await apiArkkiesOutlets();
          if (outletsResponse.success && outletsResponse.data) {
            setOutlets(outletsResponse.data);
          }
        } catch (err) {
          console.error('Failed to load outlets:', err);
        }
      } else {
        setError(response.error || 'Failed to login to Arkkies. Please check your credentials.');
      }
    } catch (err: any) {
      setError('Failed to connect to Arkkies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoorAccess = async () => {
    if (!targetOutlet) {
      setError('Please select a gym location first.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiArkkiesBookAndAccess({
        homeOutletId: targetOutlet, // Use same outlet for simplicity
        targetOutletId: targetOutlet,
        selectedDoor: 'Main Entrance'
      });

      if (response.success) {
        setSuccess(`🚪 Door opened successfully! Enjoy your workout! 💪`);
      } else {
        setError(response.error || 'Failed to open door. Please try again.');
      }
    } catch (err: any) {
      setError('Failed to connect to gym access system. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-primary p-4">
        <div className="flex items-start justify-start mb-6">
          <BackButton onClick={onBack} />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-brand-secondary-text">Checking Arkkies session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-primary p-4">
      <div className="flex items-start justify-start mb-6">
        <BackButton onClick={onBack} />
      </div>

      {/* Dismissible Connected Popup */}
      {showConnectedPopup && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-300 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Connected to Arkkies</span>
            </div>
            <button 
              onClick={() => setShowConnectedPopup(false)}
              className="ml-4 text-green-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div className="bg-brand-surface rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-center">Gym Access</h2>
          
          {!isLoggedIn ? (
            // Login Form
            <div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">Email</label>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                    className="w-full p-3 rounded-lg bg-brand-bg border border-brand-border text-brand-primary focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">Password</label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                    className="w-full p-3 rounded-lg bg-brand-bg border border-brand-border text-brand-primary focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Connecting...' : 'Connect to Arkkies'}
                </button>
              </form>
            </div>
          ) : (
            // Main Gym Access Interface
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">Gym Location</label>
                  <select
                    value={targetOutlet}
                    onChange={(e) => setTargetOutlet(e.target.value)}
                    className="w-full p-3 rounded-lg bg-brand-bg border border-brand-border text-brand-primary focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select gym location</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleDoorAccess}
                disabled={loading || !targetOutlet}
                className="w-full bg-brand-primary text-brand-primary-text p-4 rounded-lg font-bold hover:bg-brand-secondary disabled:opacity-50 transition-colors text-lg"
              >
                {loading ? 'Opening Door...' : '🚪 Open Door'}
              </button>

              {error && (
                <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500 bg-opacity-10 border border-green-500 text-green-500 p-3 rounded-lg text-sm">
                  {success}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-brand-secondary-text">
          🔒 Your Arkkies credentials are encrypted and stored securely
        </p>
      </div>
    </div>
  );
};

export default GymAccess;