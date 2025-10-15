import React, { useEffect, useState } from 'react';
import { BackButton } from './common';
import { useAuth } from '../context/AuthContext';
import {
  apiArkkiesLogin,
  apiArkkiesSessionStatus,
  apiArkkiesOutlets,
  apiArkkiesBookAndAccess,
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

const PRESET_OUTLETS: GymOutlet[] = [
  { id: 'AGRBGK01', name: 'Ark Grit • Buangkok', location: 'Buangkok' },
  { id: 'AGRSRN01', name: 'Ark Grit • Serangoon North', location: 'Serangoon North' },
  { id: 'AGRJUR01', name: 'Ark Grit • Jurong', location: 'Jurong' },
  { id: 'AGRHUG01', name: 'Ark Grit • Hougang', location: 'Hougang' },
  { id: 'AGRDTE01', name: 'Ark Grit • Downtown East', location: 'Downtown East' },
];

const GymAccess: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [, setSessionInfo] = useState<any>(null);
  const [showConnectedPopup, setShowConnectedPopup] = useState(false);

  const [credentials, setCredentials] = useState<ArkkiesCredentials>({
    email: '',
    password: '',
  });

  const [homeOutlet, setHomeOutlet] = useState('');
  const [targetOutlet, setTargetOutlet] = useState('');
  const [doorId, setDoorId] = useState('');

  const [outlets, setOutlets] = useState<GymOutlet[]>(PRESET_OUTLETS);

  const defaultDoorFor = (outletId: string) => `${outletId}-D01`;

  const applyDefaultOutlets = (list: GymOutlet[]) => {
    if (!homeOutlet && list.length > 0) {
      setHomeOutlet(list[0].id);
    }
    if (!targetOutlet && list.length > 0) {
      setTargetOutlet(list[0].id);
      setDoorId(defaultDoorFor(list[0].id));
    }
  };

  useEffect(() => {
    applyDefaultOutlets(outlets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkExistingSession = async () => {
      const cachedSession = localStorage.getItem(`arkkies_session_${currentUser?.id}`);
      if (cachedSession) {
        try {
          const sessionData = JSON.parse(cachedSession);
          const cacheAge = Date.now() - sessionData.timestamp;
          if (cacheAge < 5 * 60 * 1000 && sessionData.data && sessionData.data.valid) {
            setIsLoggedIn(true);
            setSessionInfo(sessionData.data);
            setShowConnectedPopup(true);
            setIsCheckingSession(false);
            return;
          }
        } catch {
          // ignore invalid cache
        }
        // Clear invalid or expired cache
        localStorage.removeItem(`arkkies_session_${currentUser?.id}`);
      }

      setIsCheckingSession(true);
      try {
        const response = await apiArkkiesSessionStatus();

        if (response.success && response.data && response.data.valid) {
          setIsLoggedIn(true);
          setSessionInfo(response.data);
          setShowConnectedPopup(true);

          localStorage.setItem(
            `arkkies_session_${currentUser?.id}`,
            JSON.stringify({
              data: response.data,
              timestamp: Date.now(),
            }),
          );

          try {
            const outletsResponse = await apiArkkiesOutlets();
            if (outletsResponse.success && Array.isArray(outletsResponse.data)) {
              setOutlets(outletsResponse.data);
              applyDefaultOutlets(outletsResponse.data);
            }
          } catch (err) {
            console.error('Failed to load outlets:', err);
          }
        } else {
          setIsLoggedIn(false);
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
  }, [currentUser, token]);

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

        localStorage.setItem(
          `arkkies_session_${currentUser?.id}`,
          JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
          }),
        );

        try {
          const outletsResponse = await apiArkkiesOutlets();
          if (outletsResponse.success && Array.isArray(outletsResponse.data)) {
            setOutlets(outletsResponse.data);
            applyDefaultOutlets(outletsResponse.data);
          }
        } catch (err) {
          console.error('Failed to load outlets:', err);
        }
      } else {
        setError(response.error || 'Failed to login to Arkkies. Please check your credentials.');
      }
    } catch (err) {
      setError('Failed to connect to Arkkies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoorAccess = async () => {
    if (!homeOutlet) {
      setError('Please select your home outlet first.');
      return;
    }

    if (!targetOutlet) {
      setError('Please select a destination outlet.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiArkkiesBookAndAccess({
        homeOutletId: homeOutlet,
        targetOutletId: targetOutlet,
        doorId: doorId || defaultDoorFor(targetOutlet),
      });

      if (response.success) {
        setSuccess('Door opened successfully! Enjoy your workout!');
      } else {
        // Check if this is a credentials issue
        if (response.error?.includes('connect to Arkkies first') || 
            (response as any).requiresArkkiesLogin) {
          setIsLoggedIn(false);
          localStorage.removeItem(`arkkies_session_${currentUser?.id}`);
          setError('Your Arkkies session has expired. Please log in again.');
        } else {
          setError(response.error || 'Failed to open door. Please try again.');
        }
      }
    } catch (err) {
      setError('Failed to connect to gym access system. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-primary p-4">
        <div className="flex items-start justify-start mb-6">
          <BackButton onClick={onBack} />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
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

      {showConnectedPopup && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-300 rounded-full mr-2" />
              <span className="text-sm font-medium">Connected to Arkkies</span>
            </div>
            <button
              onClick={() => setShowConnectedPopup(false)}
              className="ml-4 text-green-200 hover:text-white"
            >
              x
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div className="bg-brand-surface rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-center">Gym Access</h2>

          {!isLoggedIn ? (
            <div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">Email</label>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    className="w-full p-3 rounded-lg bg-brand-bg border border-brand-border text-brand-primary focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">Password</label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">Home Outlet</label>
                  <select
                    value={homeOutlet}
                    onChange={(e) => setHomeOutlet(e.target.value)}
                    className="w-full p-3 rounded-lg bg-brand-bg border border-brand-border text-brand-primary focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select home outlet</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">Destination Outlet</label>
                  <select
                    value={targetOutlet}
                    onChange={(e) => {
                      setTargetOutlet(e.target.value);
                      setDoorId(defaultDoorFor(e.target.value));
                    }}
                    className="w-full p-3 rounded-lg bg-brand-bg border border-brand-border text-brand-primary focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select destination outlet</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-brand-secondary mb-2 text-sm">
                    Door Identifier (optional)
                  </label>
                  <input
                    type="text"
                    value={doorId}
                    onChange={(e) => setDoorId(e.target.value)}
                    placeholder="e.g. AGRBGK01-D01"
                    className="w-full p-3 rounded-lg bg-brand-bg border border-brand-border text-brand-primary focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-brand-secondary-text mt-1">
                    We will default to &quot;&lt;destination&gt;-D01&quot; if left blank.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDoorAccess}
                disabled={loading || !homeOutlet || !targetOutlet}
                className="w-full bg-brand-primary text-brand-primary-text p-4 rounded-lg font-bold hover:bg-brand-secondary disabled:opacity-50 transition-colors text-lg"
              >
                {loading ? 'Opening Door...' : 'Open Door'}
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
          Your Arkkies credentials are encrypted and stored securely
        </p>
      </div>
    </div>
  );
};

export default GymAccess;
