import React, { useState, useEffect } from 'react';
import { BackButton } from './common';
import { useAuth } from '../context/AuthContext';
import { 
  apiArkkiesLogin, 
  apiArkkiesSessionStatus, 
  apiArkkiesOutlets,
  apiArkkiesBookAndAccess,
  apiArkkiesTestRealApi,
  apiArkkiesTestEnhancedApi,
  apiArkkiesAutomatedBooking
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

interface BookingStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

const GymAccess: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, token } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Form state
  const [credentials, setCredentials] = useState<ArkkiesCredentials>({
    email: '',
    password: ''
  });
  const [homeOutlet, setHomeOutlet] = useState('');
  const [targetOutlet, setTargetOutlet] = useState('');
  const [selectedDoor, setSelectedDoor] = useState('');

  // Real Arkkies gym outlets
  const [outlets, setOutlets] = useState<GymOutlet[]>([
    { id: 'bishan', name: 'Arkkies Bishan', location: 'Bishan' },
    { id: 'hougang', name: 'Arkkies Hougang', location: 'Hougang' },
    { id: 'choa-chu-kang', name: 'Arkkies Choa Chu Kang', location: 'Choa Chu Kang' },
    { id: 'jurong', name: 'Arkkies Jurong', location: 'Jurong' },
    { id: 'geylang', name: 'Arkkies Geylang', location: 'Geylang' },
    { id: 'keat-hong', name: 'Arkkies Keat Hong', location: 'Keat Hong' },
    { id: 'serangoon-north', name: 'Arkkies Serangoon North', location: 'Serangoon North' },
    { id: 'buangkok', name: 'Arkkies Buangkok', location: 'Buangkok' },
    { id: 'jurong-spring-cc', name: 'Arkkies Jurong Spring CC', location: 'Jurong Spring CC' },
    { id: 'downtown-east', name: 'Arkkies Downtown East', location: 'Downtown East' }
  ]);

  const [doors] = useState<string[]>([
    'Main Entrance',
    'VIP Entrance'
  ]);

  const steps: BookingStep[] = [
    {
      step: 1,
      title: 'Login to Arkkies',
      description: isLoggedIn ? 'Already logged in to Arkkies ✓' : 'Enter your Arkkies account credentials',
      status: isLoggedIn || currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending'
    },
    {
      step: 2,
      title: 'Select Outlets',
      description: 'Choose your home outlet and target outlet',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      step: 3,
      title: 'Book & Access',
      description: 'Automatically book slot and open gym door',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending'
    }
  ];

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
            setCurrentStep(2);
            setSuccess(`Already connected to Arkkies! (Cached)`);
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
          setCurrentStep(2); // Skip login step
          setSuccess(`Already connected to Arkkies! (Since ${new Date(response.data.loginTime).toLocaleTimeString()})`);
          
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
        setSuccess('Successfully logged into Arkkies! Session will persist.');
        setCurrentStep(2);
        
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

  const handleOutletSelection = () => {
    if (!homeOutlet || !targetOutlet) {
      setError('Please select both home outlet and target outlet.');
      return;
    }
    setError('');
    setCurrentStep(3);
  };

  const handleDoorAccess = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await apiArkkiesBookAndAccess({
        homeOutletId: homeOutlet,
        targetOutletId: targetOutlet,
        selectedDoor: selectedDoor || 'Main Entrance'
      });

      if (response.success) {
        setSuccess(`Successfully opened ${response.data.door} at ${response.data.outlet}! Enjoy your workout! 💪`);
        setCurrentStep(4);
      } else {
        setError(response.error || 'Failed to access gym. Please try again.');
      }
    } catch (err: any) {
      setError('Failed to connect to gym access system. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const testRealAPI = async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiArkkiesTestRealApi();
      
      if (response.success) {
        setSuccess('✅ Real API test successful! Your session can access real Arkkies endpoints.');
        console.log('Real API test results:', response.data);
      } else {
        setError(`❌ Real API test failed: ${response.error}`);
      }
    } catch (err: any) {
      setError('❌ Failed to test real API connection.');
    } finally {
      setLoading(false);
    }
  };

  const testEnhancedAPI = async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiArkkiesTestEnhancedApi({ 
        outletId: targetOutlet || 'AGRBGK01' // Use selected outlet or default
      });

      if (response.success) {
        const { doorAccess, activeBooking, userBookings } = response.data;
        
        if (doorAccess) {
          setSuccess(`🚀 Enhanced API test successful! Found active booking: ${activeBooking}. Door access ready!`);
          console.log('Enhanced API results:', response.data);
          
          // If we got door access, show the URL
          if (doorAccess.doorEntryUrl) {
            setSuccess(prev => prev + ` Door URL: ${doorAccess.doorEntryUrl}`);
          }
        } else if (userBookings && userBookings.bookings && userBookings.bookings.length > 0) {
          setSuccess(`✅ Enhanced API working! Found ${userBookings.bookings.length} bookings, but no active booking for selected outlet.`);
        } else {
          setSuccess('✅ Enhanced API connected successfully, but no active bookings found.');
        }
        
      } else {
        setError(`❌ Enhanced API test failed: ${response.error}`);
      }
    } catch (err: any) {
      setError('❌ Failed to test enhanced API connection.');
    } finally {
      setLoading(false);
    }
  };

  const automatedBookAndUnlock = async () => {
    if (!homeOutlet || !targetOutlet) {
      setError('❌ Please select both home and destination outlets first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🚀 Starting automated booking...', { homeOutlet, targetOutlet });
      
      const response = await apiArkkiesAutomatedBooking({
        homeOutlet,
        destinationOutlet: targetOutlet,
        sessionCookie: sessionInfo?.sessionCookie || 'mock_session'
      });

      console.log('Automated booking response:', response);
      
      if (response.success) {
        setSuccess(`🎉 ${response.data.message}\n\n🚪 Door Entry URL: ${response.data.doorAccess?.url}\n\n⏰ Auto-opening in 3 seconds...`);
        
        // Show booking details
        console.log('Booking Details:', response.data.booking);
        console.log('Door Access:', response.data.doorAccess);
        console.log('Automation Steps:', response.data.automation);
        
        // Auto-open door URL after 3 seconds
        if (response.data.doorAccess?.url) {
          setTimeout(() => {
            console.log('🚪 Opening door access URL:', response.data.doorAccess.url);
            window.open(response.data.doorAccess.url, '_blank');
          }, 3000);
        }
        
        // Move to success step
        setCurrentStep(4);
      } else {
        setError(`❌ Automated booking failed: ${response.error}`);
      }
    } catch (err: any) {
      setError('❌ Failed to execute automated booking and unlock.');
    } finally {
      setLoading(false);
    }
  };

  const resetProcess = () => {
    setCurrentStep(1);
    setCredentials({ email: '', password: '' });
    setHomeOutlet('');
    setTargetOutlet('');
    setSelectedDoor('');
    setError('');
    setSuccess('');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.step} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            step.status === 'completed' ? 'bg-green-500 text-white' :
            step.status === 'active' ? 'bg-brand-primary text-brand-primary-text' :
            step.status === 'error' ? 'bg-red-500 text-white' :
            'bg-brand-surface-alt text-brand-secondary-text'
          }`}>
            {step.status === 'completed' ? '✓' : step.step}
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-4 ${
              step.status === 'completed' ? 'bg-green-500' : 'bg-brand-surface-alt'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-brand-surface p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">
              Step 1: Login to Arkkies
              {isLoggedIn && <span className="ml-2 text-green-500">✓ Logged In</span>}
            </h3>
            {isLoggedIn ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-green-800 font-medium">
                    🎉 Already logged in to Arkkies!
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    Your session is persistent and ready to use.
                    {sessionInfo?.loginTime && (
                      <span className="block">
                        Logged in since: {new Date(sessionInfo.loginTime).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-3 bg-brand-primary text-brand-primary-text font-bold rounded hover:bg-brand-secondary transition-colors"
                  >
                    Continue to Outlet Selection →
                  </button>
                  <button
                    type="button"
                    onClick={testRealAPI}
                    className="w-full py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 transition-colors text-sm"
                  >
                    🧪 Test Real API Integration
                  </button>
                  <button
                    type="button"
                    onClick={testEnhancedAPI}
                    className="w-full py-2 bg-purple-500 text-white font-bold rounded hover:bg-purple-600 transition-colors text-sm"
                  >
                    🚀 Test Enhanced API (Dynamic Booking)
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-brand-secondary-text">
                  Email Address
                </label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full p-3 rounded bg-brand-surface-alt border border-brand-border text-brand-primary"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-brand-secondary-text">
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Your Arkkies password"
                  className="w-full p-3 rounded bg-brand-surface-alt border border-brand-border text-brand-primary"
                  required
                  disabled={loading}
                />
              </div>
                <button
                  type="submit"
                  disabled={loading || !credentials.email || !credentials.password}
                  className="w-full py-3 bg-brand-primary text-brand-primary-text font-bold rounded hover:bg-brand-secondary disabled:bg-brand-surface-alt disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Logging in...' : 'Login to Arkkies'}
                </button>
              </form>
            )}
          </div>
        );

      case 2:
        return (
          <div className="bg-brand-surface p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Step 2: Select Outlets</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-3 text-brand-secondary-text">
                  Home Outlet (Your subscription outlet)
                </label>
                <select
                  value={homeOutlet}
                  onChange={(e) => setHomeOutlet(e.target.value)}
                  className="w-full p-3 rounded bg-brand-surface-alt border border-brand-border text-brand-primary focus:border-brand-primary focus:outline-none"
                >
                  <option value="">Select your home outlet...</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} - {outlet.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3 text-brand-secondary-text">
                  Target Outlet (Where you want to access)
                </label>
                <select
                  value={targetOutlet}
                  onChange={(e) => setTargetOutlet(e.target.value)}
                  className="w-full p-3 rounded bg-brand-surface-alt border border-brand-border text-brand-primary focus:border-brand-secondary focus:outline-none"
                >
                  <option value="">Select target outlet...</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} - {outlet.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3 text-brand-secondary-text">
                  Select Door Access Point
                </label>
                <select
                  value={selectedDoor}
                  onChange={(e) => setSelectedDoor(e.target.value)}
                  className="w-full p-3 rounded bg-brand-surface-alt border border-brand-border text-brand-primary focus:border-brand-primary focus:outline-none"
                >
                  <option value="">Select door access point...</option>
                  {doors.map((door) => (
                    <option key={door} value={door}>
                      {door}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleOutletSelection}
                disabled={!homeOutlet || !targetOutlet}
                className="w-full py-3 bg-brand-primary text-brand-primary-text font-bold rounded hover:bg-brand-secondary disabled:bg-brand-surface-alt disabled:opacity-50 transition-colors"
              >
                Continue to Door Access
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="bg-brand-surface p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Step 3: Book & Access Door</h3>
            <div className="space-y-4 mb-6">
              <div className="bg-brand-surface-alt p-4 rounded">
                <div className="text-sm text-brand-secondary-text mb-2">Home Outlet:</div>
                <div className="font-semibold">{outlets.find(o => o.id === homeOutlet)?.name}</div>
              </div>
              <div className="bg-brand-surface-alt p-4 rounded">
                <div className="text-sm text-brand-secondary-text mb-2">Target Outlet:</div>
                <div className="font-semibold">{outlets.find(o => o.id === targetOutlet)?.name}</div>
              </div>
              <div className="bg-brand-surface-alt p-4 rounded">
                <div className="text-sm text-brand-secondary-text mb-2">Booking Time:</div>
                <div className="font-semibold">{new Date().toLocaleString()}</div>
              </div>
              <div className="bg-brand-surface-alt p-4 rounded">
                <div className="text-sm text-brand-secondary-text mb-2">Selected Door:</div>
                <div className="font-semibold">{selectedDoor || 'Main Entrance (default)'}</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={automatedBookAndUnlock}
                disabled={loading || !homeOutlet || !targetOutlet}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded hover:from-purple-700 hover:to-blue-700 disabled:bg-brand-surface-alt disabled:opacity-50 transition-colors text-lg"
              >
                {loading ? '🚀 Automating Booking & Door Unlock...' : '🚀 AUTOMATED: Book + Unlock Door (1-Click)'}
              </button>
              
              <div className="text-center text-sm text-brand-secondary-text">
                ✨ Automated flow: Monthly pass → Today's date → Current time → Door unlock
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-brand-surface text-brand-secondary-text">or use manual booking</span>
                </div>
              </div>
              
              <button
                onClick={handleDoorAccess}
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:bg-brand-surface-alt disabled:opacity-50 transition-colors"
              >
                {loading ? 'Booking & Opening Door...' : '🔓 Manual Book Slot & Open Door'}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="bg-brand-surface p-6 rounded-lg text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-4">Door Access Successful!</h3>
            <p className="text-brand-secondary-text mb-6">
              Your gym slot has been booked and the door is now open. 
              Have a great workout session!
            </p>
            <button
              onClick={resetProcess}
              className="px-6 py-3 bg-brand-primary text-brand-primary-text font-bold rounded hover:bg-brand-secondary transition-colors"
            >
              Access Another Gym
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading screen while checking session
  if (isCheckingSession) {
    return (
      <div>
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
    <div>
      <div className="flex items-start justify-start mb-6">
        <BackButton onClick={onBack} />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center mb-2">Gym Access</h2>
        <p className="text-brand-secondary-text text-center">
          Automatically book your gym slot and open doors
        </p>
      </div>

      {renderStepIndicator()}

      {error && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500 bg-opacity-10 border border-green-500 text-green-500 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      {renderCurrentStep()}

      <div className="mt-8 text-center">
        <p className="text-xs text-brand-secondary-text">
          🔒 Your Arkkies credentials are encrypted and stored securely
        </p>
      </div>
    </div>
  );
};

export default GymAccess;