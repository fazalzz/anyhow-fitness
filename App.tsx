
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkoutProvider } from './context/WorkoutContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <WorkoutProvider>
        <Main />
      </WorkoutProvider>
    </AuthProvider>
  );
};

const Main: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-brand-bg text-brand-primary font-sans">
      {currentUser ? <Dashboard /> : <LoginScreen />}
    </div>
  );
};

export default App;