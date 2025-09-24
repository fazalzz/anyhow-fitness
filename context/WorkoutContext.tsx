import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { FrontendWorkout as Workout, FrontendPost as Post, FrontendBodyWeightEntry as BodyWeightEntry } from '../types';
// @ts-ignore
import * as api from '../src/apiClient';

interface WorkoutContextType {
  workouts: Workout[];
  posts: Post[];
  bodyWeightEntries: BodyWeightEntry[];
  loading: boolean;
  addWorkout: (workout: Workout) => Promise<void>;
  getWorkoutsByUserId: (userId: string) => Workout[];
  addPost: (post: Post) => Promise<void>;
  getHighestWeight: (userId: string, exerciseId: string, variation: 'Bilateral' | 'Unilateral') => number;
  getBrandsForExercise: (userId: string, exerciseId: string) => string[];
  addBodyWeightEntry: (entry: BodyWeightEntry) => Promise<void>;
  getBodyWeightEntriesByUserId: (userId: string) => BodyWeightEntry[];
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [workoutResult, postsResult, bodyWeightResult] = await Promise.all([
          api.apiFetchWorkouts(),
          api.apiFetchPosts(),
          api.apiFetchBodyWeightEntries()
        ]);

        if (workoutResult.success && workoutResult.data) {
          setWorkouts(workoutResult.data);
        }
        if (postsResult.success && postsResult.data) {
          setPosts(postsResult.data);
        }
        if (bodyWeightResult.success && bodyWeightResult.data) {
          setBodyWeightEntries(bodyWeightResult.data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setWorkouts([]);
        setPosts([]);
        setBodyWeightEntries([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  const addWorkout = async (workout: Workout) => {
    try {
      const result = await api.apiAddWorkout(workout);
      if (result.success && result.data) {
        const newWorkout: Workout = result.data;
        setWorkouts(prev => [newWorkout, ...prev]);
      }
    } catch (error) {
      console.error('Error adding workout:', error);
    }
  };

  const getWorkoutsByUserId = (userId: string): Workout[] => {
    return workouts
      .filter(w => w.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const addPost = async (post: Post) => {
    try {
      const result = await api.apiAddPost(post);
      if (result.success && result.data) {
        const newPost: Post = result.data;
        setPosts(prev => [newPost, ...prev]);
      }
    } catch (error) {
      console.error('Error adding post:', error);
    }
  };
  
  const getHighestWeight = (userId: string, exerciseId: string, variation: 'Bilateral' | 'Unilateral'): number => {
    const userWorkouts = getWorkoutsByUserId(userId);
    let maxWeight = 0;
    
    userWorkouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        if (ex.exerciseId === exerciseId && ex.variation === variation) {
          ex.sets.forEach(set => {
            const totalWeight = set.weight + (set.pinWeight || 0);
            if (totalWeight > maxWeight) {
              maxWeight = totalWeight;
            }
          });
        }
      });
    });

    return maxWeight;
  };

  const getBrandsForExercise = (userId: string, exerciseId: string): string[] => {
    const userWorkouts = getWorkoutsByUserId(userId);
    const brands = new Set<string>();

    userWorkouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        if (ex.exerciseId === exerciseId && ex.brand) {
          brands.add(ex.brand);
        }
      });
    });
    
    return Array.from(brands);
  };

  const addBodyWeightEntry = async (entry: BodyWeightEntry) => {
    try {
      const result = await api.apiAddBodyWeightEntry(entry);
      if (result.success && result.data) {
        const newEntry: BodyWeightEntry = result.data;
        setBodyWeightEntries(prev => [...prev, newEntry]);
      }
    } catch (error) {
      console.error('Error adding body weight entry:', error);
    }
  };

  const getBodyWeightEntriesByUserId = (userId: string): BodyWeightEntry[] => {
    return bodyWeightEntries
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <WorkoutContext.Provider 
      value={{ 
        workouts, 
        posts, 
        bodyWeightEntries, 
        loading, 
        addWorkout, 
        getWorkoutsByUserId, 
        addPost, 
        getHighestWeight, 
        getBrandsForExercise, 
        addBodyWeightEntry, 
        getBodyWeightEntriesByUserId 
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = (): WorkoutContextType => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
