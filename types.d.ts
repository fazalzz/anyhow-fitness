export interface BaseUser {
    id: string;
    name: string;
    username: string;
    displayName: string;
    avatar?: string;
    is_private: boolean;
    isPrivate: boolean;
}
export interface FrontendUser extends BaseUser {
    pin: string;
    phoneNumber: string;
}
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
export interface FrontendWorkout {
    id: string;
    userId: string;
    date: string;
    branch: string;
    exercises: LoggedExercise[];
}
export interface FrontendPost {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    date: string;
    imageUrl: string;
    caption: string;
    workoutId: string;
}
export interface FrontendBodyWeightEntry {
    id: string;
    userId: string;
    date: string;
    weight: number;
}
export interface GymBranch {
    id: string;
    name: string;
    gym_name: string;
    address?: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    status?: number;
}
export declare class ApiError extends Error {
    error: string;
    status: number;
    constructor(error: string, status: number);
}
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
export type Workout = FrontendWorkout;
export type Post = FrontendPost;
export type BodyWeightEntry = FrontendBodyWeightEntry;
