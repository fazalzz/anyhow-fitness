// Common shared types between frontend and backend
export interface BaseUser {
  id: string;
  username: string; // hidden/internal unique user id
  name: string; // display name for UI (database column)
  displayName: string; // alias for name for UI compatibility
  avatar?: string;
  is_private: boolean; // database column
  isPrivate: boolean; // alias for is_private for UI compatibility
}

// Frontend-specific user type
export interface FrontendUser extends BaseUser {
  pin: string;
  phoneNumber: string;
}

// Exercise and workout related types
export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  // Backward compatibility
  muscleGroup: string; // Will be set to primaryMuscle
}

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  pinWeight?: number;
  isPR: boolean;
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  variation: 'Bilateral' | 'Unilateral';
  brand: string;
  sets: ExerciseSet[];
}

// Frontend workout type
export interface FrontendWorkout {
  id: string;
  userId: string;
  date: string; // ISO string
  branch: string;
  exercises: LoggedExercise[];
}

// Frontend post type
export interface FrontendPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string; // ISO string
  imageUrl: string; // base64
  caption: string;
  workoutId: string;
}

// Frontend body weight entry type
export interface FrontendBodyWeightEntry {
  id: string;
  userId: string;
  date: string; // ISO string
  weight: number;
}

// Gym management types
export interface GymBranch {
  id: string;
  name: string;
  gym_name: string;
  address?: string;
}

// Utility types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class ApiError extends Error {
  constructor(
    public error: string,
    public status: number
  ) {
    super(error);
    this.name = 'ApiError';
  }
}

// Legacy types for backwards compatibility
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData extends LoginCredentials {
  username: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Additional aliases for common usage
export type Workout = FrontendWorkout;
export type Post = FrontendPost;
export type BodyWeightEntry = FrontendBodyWeightEntry;