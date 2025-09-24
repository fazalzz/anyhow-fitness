import { FrontendUser as User, Exercise } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'user1', name: 'Alex', avatar: 'https://i.pravatar.cc/150?u=user1', pin: '12345678', phoneNumber: '91234567', is_private: false },
  { id: 'user2', name: 'Ben', avatar: 'https://i.pravatar.cc/150?u=user2', pin: '12345678', phoneNumber: '92345678', is_private: false },
  { id: 'user3', name: 'Casey', avatar: 'https://i.pravatar.cc/150?u=user3', pin: '12345678', phoneNumber: '93456789', is_private: false },
  { id: 'user4', name: 'Dana', avatar: 'https://i.pravatar.cc/150?u=user4', pin: '12345678', phoneNumber: '94567890', is_private: false },
];

export const GYMS: string[] = [
  'ArkGrit - Buangkok',
  'ArkGrit - Hougang', 
  'ArkGrit - Bishan',
  'ArkGrit - Serangoon North',
  'ArkGrit - Downtown East',
  'ArkGrit - Jurong West',
  'ArkGrit - Tampines',
  'ArkGrit - Yishun',
];

// Keep BRANCHES for backward compatibility during migration
export const BRANCHES: string[] = GYMS;

export const GYM_BRANDS: string[] = ['Movement First', 'Precor', 'Life Fitness', 'Hammer Strength'];

export const EXERCISES: Exercise[] = [
    { id: 'ex15', name: 'Ab Weighted Decline Crunch', muscleGroup: 'Core' },
    { id: 'ex3', name: 'Adductor Machine', muscleGroup: 'Legs' },
    { id: 'ex5', name: 'Cable Lateral Raise', muscleGroup: 'Shoulders' },
    { id: 'ex6', name: 'Chest Press Machine', muscleGroup: 'Chest' },
    { id: 'ex9', name: 'Chest Supported Row', muscleGroup: 'Back' },
    { id: 'ex14', name: 'Dumbbell Preacher Curls', muscleGroup: 'Arms' },
    { id: 'ex1', name: 'Hamstring Curl', muscleGroup: 'Legs' },
    { id: 'ex7', name: 'JM Press (Triceps)', muscleGroup: 'Arms' },
    { id: 'ex8', name: 'Lat Pulldown', muscleGroup: 'Back' },
    { id: 'ex4', name: 'Lateral Raise', muscleGroup: 'Shoulders' },
    { id: 'ex16', name: 'Leg Extensions', muscleGroup: 'Legs' },
    { id: 'ex17', name: 'Leg Press', muscleGroup: 'Legs' },
    { id: 'ex2', name: 'Lying Hamstring Curl', muscleGroup: 'Legs' },
    { id: 'ex11', name: 'Machine Chest Press', muscleGroup: 'Chest' },
    { id: 'ex13', name: 'Machine Preacher Curls', muscleGroup: 'Arms' },
    { id: 'ex10', name: 'Pec Dec Machine', muscleGroup: 'Chest' },
    { id: 'ex12', name: 'Tricep Cable Cuffed Extension', muscleGroup: 'Arms' },
].sort((a, b) => a.name.localeCompare(b.name));
