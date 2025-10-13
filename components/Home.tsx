import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { ChartIcon } from './icons';

interface HomeProps {
  onNavigate: (view: string) => void;
}

interface CalendarDay {
  date: Date;
  workoutCount: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}



export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { workouts } = useWorkout();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const shortcuts = [
    {
      id: 'workout',
      title: 'Start Workout', 
      description: 'Begin your fitness session',
      image: '/workout.png',
      view: 'NEW_WORKOUT'
    },
    {
      id: 'stats',
      title: 'View Stats',
      description: 'Check your progress',
      icon: ChartIcon,
      view: 'STATS'
    },
    {
      id: 'bodyweight',
      title: 'Track Weight',
      description: 'Log your bodyweight',
      image: '/weightscale.png',
      view: 'BODYWEIGHT'
    },
    {
      id: 'gymaccess',
      title: 'Gym Access',
      description: 'Access Arkkies booking',
      image: '/access.png',
      view: 'GYM_ACCESS'
    }
  ];

  // Generate calendar days with workout counts
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Count workouts for this date
      const workoutCount = workouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        return workoutDate.toDateString() === date.toDateString();
      }).length;
      
      days.push({
        date,
        workoutCount,
        isToday: date.toDateString() === today.toDateString(),
        isCurrentMonth: date.getMonth() === month
      });
    }
    
    setCalendarDays(days);
  }, [currentDate, workouts]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
    
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-4 space-y-6 bg-brand-surface min-h-full">
      {/* Welcome Section */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-brand-primary">
          Welcome back, {currentUser?.displayName || 'User'}!
        </h1>
        <p className="text-brand-secondary-text">Ready to continue your fitness journey?</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-brand-primary">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((shortcut) => {
            return (
              <button
                key={shortcut.id}
                onClick={() => onNavigate(shortcut.view)}
                className="p-4 bg-brand-bg rounded-lg border border-brand-border hover:bg-brand-surface-alt transition-colors active:scale-95"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white overflow-hidden">
                    {shortcut.image ? (
                      <img 
                        src={shortcut.image} 
                        alt={shortcut.title}
                        className="w-8 h-8 object-contain"
                      />
                    ) : shortcut.icon ? (
                      <shortcut.icon />
                    ) : null}
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium text-brand-primary text-sm">{shortcut.title}</h3>
                    <p className="text-xs text-brand-secondary-text mt-1">{shortcut.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workout Calendar */}
      <div className="bg-brand-bg rounded-lg p-4 border border-brand-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-brand-primary">Workout Calendar</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 text-brand-secondary-text hover:text-brand-primary"
              aria-label="Previous month"
            >
              {'<'}
            </button>
            <span className="text-brand-primary font-medium">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 text-brand-secondary-text hover:text-brand-primary"
              aria-label="Next month"
            >
              {'>'}
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-medium text-brand-secondary-text p-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                relative p-2 text-center text-sm rounded
                ${day.isCurrentMonth ? 'text-brand-primary' : 'text-brand-secondary-text opacity-50'}
                ${day.isToday ? 'bg-blue-600 text-white font-bold' : ''}
                ${day.workoutCount > 0 && !day.isToday ? 'bg-brand-surface-alt' : ''}
              `}
            >
              <span>{day.date.getDate()}</span>
              {day.workoutCount > 0 && (
                <div className={`
                  absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center
                  ${day.isToday ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}
                `}>
                  {day.workoutCount}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-brand-secondary-text text-center">
          Numbers show workout count for each day
        </div>
      </div>
    </div>
  );
};

