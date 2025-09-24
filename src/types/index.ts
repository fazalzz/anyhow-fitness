// Common shared types between frontend and backend
export interface BaseUser {
  id: string;
  username: string; // hidden/internal unique user id
  displayName: string; // display name for UI
  avatar?: string;
  isPrivate: boolean;
}

// Frontend-specific user type
export interface FrontendUser extends BaseUser {
  pin: string;
  phoneNumber: string;
}

// Backend-specific user type
export interface BackendUser extends BaseUser {
  phone_number: string;
  pin_hash: string;
  otp_code?: string;
  otp_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Exercise and workout related types
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
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

// Backend workout type
export interface BackendWorkout {
  id: string;
  user_id: string;
  date: Date;
  branch: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted';
  created_at: Date;
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

// Backend post type
export interface BackendPost {
  id: string;
  user_id: string;
  workout_id: string;
  image_url: string;
  caption?: string;
  date: Date;
}

// Frontend body weight entry type
export interface FrontendBodyWeightEntry {
  id: string;
  userId: string;
  date: string; // ISO string
  weight: number;
}

// Backend body weight entry type
export interface BackendBodyWeightEntry {
  id: string;
  user_id: string;
  weight: number;
  date: Date;
}

// Type guards
export const isFrontendUser = (user: any): user is FrontendUser => {
  return user && typeof user.pin === 'string' && typeof user.phoneNumber === 'string';
};

export const isBackendUser = (user: any): user is BackendUser => {
  return user && typeof user.pin_hash === 'string' && typeof user.phone_number === 'string';
};

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