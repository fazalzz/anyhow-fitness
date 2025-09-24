import React, { useState, useEffect } from 'react';
import { BackButton } from './common';
import { useAuth } from '../context/AuthContext';

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
      try {
        const response = await fetch('/api/arkkies/session-status', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setIsLoggedIn(true);
          setSessionInfo(data.data);
          setCurrentStep(2); // Skip login step
          setSuccess(`Already logged in to Arkkies! (Since ${new Date(data.data.loginTime).toLocaleTimeString()})`);
          
          // Load outlets from API
          try {
            const outletsResponse = await fetch('/api/arkkies/outlets', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }  
            });
            const outletsData = await outletsResponse.json();
            if (outletsData.success && outletsData.data) {
              setOutlets(outletsData.data);
            }
          } catch (err) {
            console.error('Failed to load outlets:', err);
          }
        }
      } catch (error) {
        console.error('Failed to check session status:', error);
      }
    };

    if (token && currentUser) {
      checkExistingSession();
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/arkkies/login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (data.success) {
        setIsLoggedIn(true);
        setSessionInfo(data.data);
        setSuccess('Successfully logged into Arkkies! Session will persist.');
        setCurrentStep(2);
        
        // Load outlets from API
        try {
          const outletsResponse = await fetch('/api/arkkies/outlets', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          const outletsData = await outletsResponse.json();
          if (outletsData.success && outletsData.data) {
            setOutlets(outletsData.data);
          }
        } catch (err) {
          console.error('Failed to load outlets:', err);
        }
      } else {
        setError(data.error || 'Failed to login to Arkkies. Please check your credentials.');
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
      const response = await fetch('/api/arkkies/book-and-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeOutletId: homeOutlet,
          targetOutletId: targetOutlet,
          selectedDoor: selectedDoor || 'Main Entrance'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Successfully opened ${data.data.door} at ${data.data.outlet}! Enjoy your workout! 💪`);
        setCurrentStep(4);
      } else {
        setError(data.error || 'Failed to access gym. Please try again.');
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
      const response = await fetch('/api/arkkies/test-real-api', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('✅ Real API test successful! Your session can access real Arkkies endpoints.');
        console.log('Real API test results:', data.data);
      } else {
        setError(`❌ Real API test failed: ${data.error}`);
      }
    } catch (err: any) {
      setError('❌ Failed to test real API connection.');
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

            <button
              onClick={handleDoorAccess}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:bg-brand-surface-alt disabled:opacity-50 transition-colors"
            >
              {loading ? 'Booking & Opening Door...' : '🔓 Book Slot & Open Door'}
            </button>
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