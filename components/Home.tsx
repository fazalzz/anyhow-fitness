import React from 'react';
import { useAuth } from '../context/AuthContext';
import { DumbbellIcon, ChartIcon, WeightIcon, SettingsIcon, HomeIcon } from './icons';

interface HomeProps {
  onNavigate: (view: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();

  const shortcuts = [
    {
      id: 'workout',
      title: 'Start Workout',
      description: 'Begin your fitness session',
      icon: DumbbellIcon,
      color: 'bg-blue-500',
      view: 'GYM_ACCESS'
    },
    {
      id: 'stats',
      title: 'View Stats',
      description: 'Check your progress',
      icon: ChartIcon,
      color: 'bg-green-500',
      view: 'STATS'
    },
    {
      id: 'bodyweight',
      title: 'Track Weight',
      description: 'Log your bodyweight',
      icon: WeightIcon,
      color: 'bg-purple-500',
      view: 'BODYWEIGHT'
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Manage your account',
      icon: SettingsIcon,
      color: 'bg-gray-500',
      view: 'SETTINGS'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <HomeIcon />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {currentUser?.displayName || 'User'}!
        </h1>
        <p className="text-gray-600">Ready to continue your fitness journey?</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {shortcuts.map((shortcut) => {
            const IconComponent = shortcut.icon;
            return (
              <button
                key={shortcut.id}
                onClick={() => onNavigate(shortcut.view)}
                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow active:scale-95"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className={`w-12 h-12 ${shortcut.color} rounded-lg flex items-center justify-center text-white`}>
                    <IconComponent />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 text-sm">{shortcut.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{shortcut.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-gray-900">Today's Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">0</p>
            <p className="text-xs text-gray-600">Workouts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">0</p>
            <p className="text-xs text-gray-600">Exercises</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">-</p>
            <p className="text-xs text-gray-600">Weight</p>
          </div>
        </div>
      </div>
    </div>
  );
};