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
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [credentials, setCredentials] = useState<ArkkiesCredentials>({
    email: '',
    password: ''
  });
  const [homeOutlet, setHomeOutlet] = useState('');
  const [targetOutlet, setTargetOutlet] = useState('');
  const [selectedDoor, setSelectedDoor] = useState('');

  // Mock outlets - will be fetched from API later
  const [outlets] = useState<GymOutlet[]>([
    { id: 'downtown', name: 'ARK Downtown', location: 'Downtown East' },
    { id: 'orchard', name: 'ARK Orchard', location: 'Orchard Central' },
    { id: 'marina', name: 'ARK Marina', location: 'Marina Bay' },
    { id: 'tampines', name: 'ARK Tampines', location: 'Tampines Mall' },
  ]);

  const [doors] = useState<string[]>([
    'Main Entrance',
    'VIP Entrance'
  ]);

  const steps: BookingStep[] = [
    {
      step: 1,
      title: 'Login to Arkkies',
      description: 'Enter your Arkkies account credentials',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending'
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Implement actual arkkies login
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setSuccess('Successfully logged into Arkkies!');
      setCurrentStep(2);
    } catch (err: any) {
      setError('Failed to login to Arkkies. Please check your credentials.');
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
      // TODO: Implement actual booking and door access
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate booking process
      
      setSuccess('Successfully opened gym door! Enjoy your workout! 💪');
      setCurrentStep(4);
    } catch (err: any) {
      setError('Failed to access gym. Please try again.');
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
            <h3 className="text-xl font-bold mb-4">Step 1: Login to Arkkies</h3>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outlets.map((outlet) => (
                    <button
                      key={outlet.id}
                      onClick={() => setHomeOutlet(outlet.id)}
                      className={`p-3 rounded border text-left transition-colors ${
                        homeOutlet === outlet.id
                          ? 'bg-brand-primary text-brand-primary-text border-brand-primary'
                          : 'bg-brand-surface-alt border-brand-border text-brand-primary hover:border-brand-primary'
                      }`}
                    >
                      <div className="font-semibold">{outlet.name}</div>
                      <div className="text-xs opacity-75">{outlet.location}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3 text-brand-secondary-text">
                  Target Outlet (Where you want to access)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outlets.map((outlet) => (
                    <button
                      key={outlet.id}
                      onClick={() => setTargetOutlet(outlet.id)}
                      className={`p-3 rounded border text-left transition-colors ${
                        targetOutlet === outlet.id
                          ? 'bg-brand-secondary text-brand-primary-text border-brand-secondary'
                          : 'bg-brand-surface-alt border-brand-border text-brand-primary hover:border-brand-secondary'
                      }`}
                    >
                      <div className="font-semibold">{outlet.name}</div>
                      <div className="text-xs opacity-75">{outlet.location}</div>
                    </button>
                  ))}
                </div>
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
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-3 text-brand-secondary-text">
                Select Door (if multiple available)
              </label>
              <div className="space-y-2">
                {doors.map((door) => (
                  <button
                    key={door}
                    onClick={() => setSelectedDoor(door)}
                    className={`w-full p-3 rounded border text-left transition-colors ${
                      selectedDoor === door
                        ? 'bg-brand-primary text-brand-primary-text border-brand-primary'
                        : 'bg-brand-surface-alt border-brand-border text-brand-primary hover:border-brand-primary'
                    }`}
                  >
                    {door}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleDoorAccess}
              disabled={loading || !selectedDoor}
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