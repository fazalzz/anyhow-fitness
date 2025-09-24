
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NewWorkout from './WorkoutSession';
import Stats from './Stats';
import { SocialFeed } from './SocialFeed';
import Profile from './Settings';
import GymAccess from './GymAccess';
import { ChartIcon, UsersIcon, SettingsIcon, DumbbellIcon } from './icons';
import Logo from './Logo';

type View = 'FEED' | 'STATS' | 'SETTINGS' | 'GYM_ACCESS' | 'NEW_WORKOUT';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeView, setActiveView] = useState<View>('FEED');

  const startWorkout = () => {
    setActiveView('NEW_WORKOUT');
  };
  
  const finishWorkout = () => {
    setActiveView('FEED');
  };

  const goBack = () => {
    setActiveView('FEED');
  };

  const renderView = () => {
    switch (activeView) {
      case 'NEW_WORKOUT':
        return <NewWorkout onFinishWorkout={finishWorkout} onBack={goBack} />;
      case 'STATS':
        return <Stats onBack={goBack} />;
      case 'FEED':
        return <SocialFeed onStartWorkout={startWorkout} />;
      case 'SETTINGS':
        return <Profile onBack={goBack} />;
      case 'GYM_ACCESS':
        return <GymAccess onBack={goBack} />;
      default:
        return <SocialFeed onStartWorkout={startWorkout} />;
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-brand-surface">
      <header className="flex items-center justify-between p-4 bg-brand-bg shadow-md">
        <div className="flex items-center">
            <Logo size="small" className="mr-3" />
            <h1 className="text-xl font-bold">Welcome, {currentUser.displayName}</h1>
        </div>
        <button onClick={logout} className="text-sm font-semibold text-brand-secondary-text hover:text-brand-primary">Logout</button>
      </header>
      
      <main className="flex-grow overflow-y-auto p-4">
        {renderView()}
      </main>
      
      {activeView !== 'NEW_WORKOUT' && (
          <nav className="flex justify-around p-2 bg-brand-bg shadow-inner">
            <button onClick={() => setActiveView('FEED')} className={`flex flex-col items-center p-2 rounded-lg w-1/4 ${activeView === 'FEED' ? 'text-brand-primary' : 'text-brand-secondary-text'}`}>
              <UsersIcon />
              <span className="text-xs mt-1">Feed</span>
            </button>
            <button onClick={() => setActiveView('STATS')} className={`flex flex-col items-center p-2 rounded-lg w-1/4 ${activeView === 'STATS' ? 'text-brand-primary' : 'text-brand-secondary-text'}`}>
              <ChartIcon />
              <span className="text-xs mt-1">Stats</span>
            </button>
            <button onClick={() => setActiveView('GYM_ACCESS')} className={`flex flex-col items-center p-2 rounded-lg w-1/4 ${activeView === 'GYM_ACCESS' ? 'text-brand-primary' : 'text-brand-secondary-text'}`}>
              <DumbbellIcon />
              <span className="text-xs mt-1">Gym</span>
            </button>
            <button onClick={() => setActiveView('SETTINGS')} className={`flex flex-col items-center p-2 rounded-lg w-1/4 ${activeView === 'SETTINGS' ? 'text-brand-primary' : 'text-brand-secondary-text'}`}>
              <SettingsIcon />
              <span className="text-xs mt-1">Profile</span>
            </button>
          </nav>
      )}
    </div>
  );
};

export default Dashboard;