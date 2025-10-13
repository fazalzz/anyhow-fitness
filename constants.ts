import { FrontendUser as User, Exercise } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'user1', username: 'alex', name: 'Alex', displayName: 'Alex', avatar: 'https://i.pravatar.cc/150?u=user1', pin: '12345678', email: 'alex@example.com', isPrivate: false, is_private: false },
  { id: 'user2', username: 'ben', name: 'Ben', displayName: 'Ben', avatar: 'https://i.pravatar.cc/150?u=user2', pin: '12345678', email: 'ben@example.com', isPrivate: false, is_private: false },
  { id: 'user3', username: 'casey', name: 'Casey', displayName: 'Casey', avatar: 'https://i.pravatar.cc/150?u=user3', pin: '12345678', email: 'casey@example.com', isPrivate: false, is_private: false },
  { id: 'user4', username: 'dana', name: 'Dana', displayName: 'Dana', avatar: 'https://i.pravatar.cc/150?u=user4', pin: '12345678', email: 'dana@example.com', isPrivate: false, is_private: false },
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
    // Keep existing exercises for backward compatibility
    { id: 'ex15', name: 'Ab Weighted Decline Crunch', primaryMuscle: 'Core', muscleGroup: 'Core' },
    { id: 'ex3', name: 'Adductor Machine', primaryMuscle: 'Adductors', muscleGroup: 'Adductors' },
    { id: 'ex5', name: 'Cable Lateral Raise', primaryMuscle: 'Medial Delts', muscleGroup: 'Medial Delts' },
    { id: 'ex6', name: 'Chest Press Machine', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], muscleGroup: 'Chest' },
    { id: 'ex9', name: 'Chest Supported Row', primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats'], muscleGroup: 'Upper Back' },
    { id: 'ex14', name: 'Dumbbell Preacher Curls', primaryMuscle: 'Biceps', muscleGroup: 'Biceps' },
    { id: 'ex1', name: 'Hamstring Curl', primaryMuscle: 'Hamstrings', secondaryMuscles: ['Calves'], muscleGroup: 'Hamstrings' },
    { id: 'ex7', name: 'JM Press (Triceps)', primaryMuscle: 'Triceps', muscleGroup: 'Triceps' },
    { id: 'ex8', name: 'Lat Pulldown', primaryMuscle: 'Lats', secondaryMuscles: ['Biceps'], muscleGroup: 'Lats' },
    { id: 'ex4', name: 'Lateral Raise', primaryMuscle: 'Medial Delts', muscleGroup: 'Medial Delts' },
    { id: 'ex16', name: 'Leg Extensions', primaryMuscle: 'Quads', muscleGroup: 'Quads' },
    { id: 'ex17', name: 'Leg Press', primaryMuscle: 'Quads', secondaryMuscles: ['Adductors', 'Glutes'], muscleGroup: 'Quads' },
    { id: 'ex2', name: 'Lying Hamstring Curl', primaryMuscle: 'Hamstrings', secondaryMuscles: ['Calves'], muscleGroup: 'Hamstrings' },
    { id: 'ex11', name: 'Machine Chest Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], muscleGroup: 'Chest' },
    { id: 'ex13', name: 'Machine Preacher Curls', primaryMuscle: 'Biceps', muscleGroup: 'Biceps' },
    { id: 'ex10', name: 'Pec Dec Machine', primaryMuscle: 'Chest', secondaryMuscles: ['Front Delts'], muscleGroup: 'Chest' },
    { id: 'ex12', name: 'Tricep Cable Cuffed Extension', primaryMuscle: 'Triceps', muscleGroup: 'Triceps' },

    // New comprehensive exercise list
    // Chest (Pectorals)
    { id: 'ex_bb_bench', name: 'Barbell Bench Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], muscleGroup: 'Chest' },
    { id: 'ex_db_bench', name: 'Dumbbell Bench Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], muscleGroup: 'Chest' },
    { id: 'ex_sm_press', name: 'Smith Machine Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'], muscleGroup: 'Chest' },
    { id: 'ex_cable_fly', name: 'Cable Fly (Low to High)', primaryMuscle: 'Chest', secondaryMuscles: ['Front Delts'], muscleGroup: 'Chest' },

    // Back - Lats
    { id: 'ex_cable_lat', name: 'Cable Lat Pulldown', primaryMuscle: 'Lats', secondaryMuscles: ['Biceps'], muscleGroup: 'Lats' },
    { id: 'ex_machine_lat', name: 'Machine Lat Pulldown', primaryMuscle: 'Lats', secondaryMuscles: ['Biceps', 'Upper Back'], muscleGroup: 'Lats' },

    // Back - Upper Back
    { id: 'ex_kelso_shrug', name: 'Kelso Shrug', primaryMuscle: 'Upper Back', muscleGroup: 'Upper Back' },
    { id: 'ex_cs_sm_row', name: 'Chest Supported Smith Row', primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats'], muscleGroup: 'Upper Back' },
    { id: 'ex_tbar_row', name: 'T-Bar Row', primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats'], muscleGroup: 'Upper Back' },
    { id: 'ex_machine_row', name: 'Machine Row', primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats'], muscleGroup: 'Upper Back' },

    // Back - Erectors
    { id: 'ex_back_ext', name: 'Machine Back Extensions', primaryMuscle: 'Erectors', muscleGroup: 'Erectors' },

    // Shoulders - Front Delts
    { id: 'ex_bb_ohp', name: 'Barbell Overhead Press', primaryMuscle: 'Front Delts', secondaryMuscles: ['Medial Delts'], muscleGroup: 'Front Delts' },
    { id: 'ex_db_ohp', name: 'Dumbbell Overhead Press', primaryMuscle: 'Front Delts', secondaryMuscles: ['Medial Delts'], muscleGroup: 'Front Delts' },
    { id: 'ex_machine_ohp', name: 'Machine Overhead Press', primaryMuscle: 'Front Delts', secondaryMuscles: ['Medial Delts'], muscleGroup: 'Front Delts' },
    { id: 'ex_sm_ohp', name: 'Smith Machine Overhead Press', primaryMuscle: 'Front Delts', secondaryMuscles: ['Medial Delts'], muscleGroup: 'Front Delts' },
    { id: 'ex_cable_front', name: 'Cable Front Raise', primaryMuscle: 'Front Delts', muscleGroup: 'Front Delts' },

    // Shoulders - Medial Delts
    { id: 'ex_db_lat_raise', name: 'Dumbbell Lateral Raise', primaryMuscle: 'Medial Delts', muscleGroup: 'Medial Delts' },
    { id: 'ex_machine_lat', name: 'Machine Lateral Raise', primaryMuscle: 'Medial Delts', muscleGroup: 'Medial Delts' },

    // Shoulders - Rear Delts
    { id: 'ex_rear_delt_fly', name: 'Rear Delt Fly', primaryMuscle: 'Rear Delts', muscleGroup: 'Rear Delts' },
    { id: 'ex_cable_rear_fly', name: 'Cable Rear Delt Fly', primaryMuscle: 'Rear Delts', muscleGroup: 'Rear Delts' },
    { id: 'ex_reverse_pec', name: 'Reverse Pec Deck', primaryMuscle: 'Rear Delts', muscleGroup: 'Rear Delts' },

    // Arms - Biceps
    { id: 'ex_bb_curl', name: 'Barbell Curl', primaryMuscle: 'Biceps', muscleGroup: 'Biceps' },
    { id: 'ex_db_curl', name: 'Dumbbell Curl', primaryMuscle: 'Biceps', muscleGroup: 'Biceps' },
    { id: 'ex_cable_curl', name: 'Cable Curl', primaryMuscle: 'Biceps', muscleGroup: 'Biceps' },
    { id: 'ex_preacher_curl', name: 'Preacher Curls', primaryMuscle: 'Biceps', muscleGroup: 'Biceps' },

    // Arms - Triceps
    { id: 'ex_carter_ext', name: 'Carter Extensions', primaryMuscle: 'Triceps', muscleGroup: 'Triceps' },
    { id: 'ex_jm_press_sm', name: 'JM Press Smith Machine', primaryMuscle: 'Triceps', muscleGroup: 'Triceps' },

    // Arms - Forearms
    { id: 'ex_wrist_curl', name: 'Wrist Curls', primaryMuscle: 'Forearms', muscleGroup: 'Forearms' },
    { id: 'ex_reverse_wrist', name: 'Reverse Wrist Curls', primaryMuscle: 'Forearms', muscleGroup: 'Forearms' },

    // Legs - Quads
    { id: 'ex_hack_squat', name: 'Hack Squat', primaryMuscle: 'Quads', secondaryMuscles: ['Adductors', 'Glutes'], muscleGroup: 'Quads' },

    // Legs - Hamstrings
    { id: 'ex_rdl', name: 'Romanian Deadlift', primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Erectors'], muscleGroup: 'Hamstrings' },
    { id: 'ex_sldl', name: 'Stiff-Leg Deadlift', primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Erectors'], muscleGroup: 'Hamstrings' },

    // Legs - Glutes
    { id: 'ex_glute_back_ext', name: 'Back Extensions (Glute Focus)', primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings', 'Erectors'], muscleGroup: 'Glutes' },
    { id: 'ex_hip_thrust', name: 'Hip Thrust', primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], muscleGroup: 'Glutes' },

    // Legs - Calves
    { id: 'ex_calf_press', name: 'Calf Press', primaryMuscle: 'Calves', muscleGroup: 'Calves' },
    { id: 'ex_calf_ext', name: 'Calf Extension', primaryMuscle: 'Calves', muscleGroup: 'Calves' },

    // Core
    { id: 'ex_machine_crunch', name: 'Machine Crunch', primaryMuscle: 'Core', muscleGroup: 'Core' },
    { id: 'ex_cable_crunch', name: 'Cable Crunch', primaryMuscle: 'Core', muscleGroup: 'Core' },
].sort((a, b) => a.name.localeCompare(b.name));
