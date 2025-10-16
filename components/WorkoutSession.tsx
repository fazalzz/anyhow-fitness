import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GYMS, GYM_BRANDS, EXERCISES } from '../constants';
import { LoggedExercise, ExerciseSet, FrontendWorkout as Workout, Exercise } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { PlaceholderIcon } from './icons';
import PostWorkoutModal from './PostWorkoutModal';
import { BackButton } from './common';
// @ts-ignore
import { api } from '../apiClient';

const UnifiedExerciseSelectionModal: React.FC<{
    onSelect: (exercise: Exercise) => void;
    onClose: () => void;
    onAddCustom: () => void;
    customExercises: Exercise[];
}> = ({ onSelect, onClose, onAddCustom, customExercises }) => {
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
    
    // Get all unique muscle groups from primary muscles and secondary muscles
    const allMuscleGroups = new Set<string>();
    [...EXERCISES, ...customExercises].forEach(ex => {
        allMuscleGroups.add(ex.primaryMuscle || ex.muscleGroup);
        if (ex.secondaryMuscles) {
            ex.secondaryMuscles.forEach(muscle => allMuscleGroups.add(muscle));
        }
    });
    const muscleGroups = ['All', ...Array.from(allMuscleGroups).sort()];
    
    const allExercises = [...EXERCISES, ...customExercises];
    const filteredExercises = selectedMuscleGroup === 'All' 
        ? allExercises 
        : allExercises.filter(ex => {
            const primaryMatch = (ex.primaryMuscle || ex.muscleGroup) === selectedMuscleGroup;
            const secondaryMatch = ex.secondaryMuscles?.includes(selectedMuscleGroup) || false;
            return primaryMatch || secondaryMatch;
        });
    
    const userCustomExercises = filteredExercises.filter(ex => ex.id.startsWith('custom-'));
    const builtInExercises = filteredExercises.filter(ex => !ex.id.startsWith('custom-'));
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-surface rounded-lg p-4 w-full max-w-sm flex flex-col h-[80vh]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Select Exercise</h3>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                
                {/* Add Custom Exercise Button */}
                <button 
                    onClick={onAddCustom}
                    className="w-full mb-4 py-3 bg-brand-primary hover:bg-brand-primary-dark text-brand-primary-text font-semibold rounded transition-colors flex items-center justify-center"
                >
                    <span className="text-xl mr-2">+</span>
                    Add Custom Exercise
                </button>
                
                {/* Muscle Group Filter Dropdown */}
                <div className="mb-4">
                    <label className="block mb-2 text-sm font-semibold text-brand-secondary-text">Filter by Muscle Group</label>
                    <select 
                        value={selectedMuscleGroup} 
                        onChange={e => setSelectedMuscleGroup(e.target.value)} 
                        className="w-full p-2 text-sm rounded bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        {muscleGroups.map(group => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                </div>
                
                {/* Exercise List */}
                <div className="overflow-y-auto space-y-2 flex-1">
                    {userCustomExercises.length > 0 && (
                        <>
                            <h4 className="text-sm font-semibold text-brand-secondary-text mb-2">Your Custom Exercises</h4>
                            {userCustomExercises.map(ex => (
                                <button key={ex.id} onClick={() => onSelect(ex)} className="w-full text-left p-3 rounded-lg flex flex-col items-start bg-brand-primary bg-opacity-20 hover:bg-opacity-30 border border-brand-primary transition-colors">
                                    <div className="flex items-center w-full">
                                        <PlaceholderIcon />
                                        <span className="ml-3 font-semibold">{ex.name}</span>
                                        <span className="ml-auto text-xs bg-brand-primary text-brand-primary-text px-2 py-1 rounded">Custom</span>
                                    </div>
                                    <div className="ml-8 mt-1 text-xs text-brand-secondary-text">
                                        Primary: {ex.primaryMuscle || ex.muscleGroup}
                                        {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                                            <span> | Secondary: {ex.secondaryMuscles.join(', ')}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {builtInExercises.length > 0 && <div className="border-t border-brand-border my-3"></div>}
                        </>
                    )}
                    {builtInExercises.length > 0 && (
                        <>
                            <h4 className="text-sm font-semibold text-brand-secondary-text mb-2">Default Exercises</h4>
                            {builtInExercises.map(ex => (
                                 <button key={ex.id} onClick={() => onSelect(ex)} className="w-full text-left p-3 rounded-lg flex flex-col items-start bg-brand-surface-alt hover:bg-brand-border transition-colors">
                                    <div className="flex items-center w-full">
                                        <PlaceholderIcon />
                                        <span className="ml-3 font-semibold">{ex.name}</span>
                                    </div>
                                    <div className="ml-8 mt-1 text-xs text-brand-secondary-text">
                                        Primary: {ex.primaryMuscle || ex.muscleGroup}
                                        {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                                            <span> | Secondary: {ex.secondaryMuscles.join(', ')}</span>
                                        )}
                                    </div>
                                 </button>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const CustomExerciseModal: React.FC<{
    onSave: (exercise: Exercise) => void;
    onBack: () => void;
    onClose: () => void;
}> = ({ onSave, onBack, onClose }) => {
    const [exerciseName, setExerciseName] = useState('');
    const [primaryMuscle, setPrimaryMuscle] = useState('');
    const [secondaryMuscle1, setSecondaryMuscle1] = useState('');
    const [secondaryMuscle2, setSecondaryMuscle2] = useState('');
    
    // Get all unique muscle groups from primary muscles and secondary muscles
    const allMuscleGroups = new Set<string>();
    EXERCISES.forEach(ex => {
        allMuscleGroups.add(ex.primaryMuscle || ex.muscleGroup);
        if (ex.secondaryMuscles) {
            ex.secondaryMuscles.forEach(muscle => allMuscleGroups.add(muscle));
        }
    });
    const muscleGroups = Array.from(allMuscleGroups).sort();
    
    const handleSave = () => {
        if (exerciseName.trim() && primaryMuscle) {
            const secondaryMuscles = [secondaryMuscle1, secondaryMuscle2]
                .filter(muscle => muscle && muscle !== primaryMuscle);
            
            const newExercise: Exercise = {
                id: `custom-${Date.now()}`,
                name: exerciseName.trim(),
                primaryMuscle: primaryMuscle,
                secondaryMuscles: secondaryMuscles.length > 0 ? secondaryMuscles : undefined,
                muscleGroup: primaryMuscle
            };
            onSave(newExercise);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-surface rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="text-xl">←</button>
                    <h3 className="text-xl font-semibold">Add Custom Exercise</h3>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-brand-secondary-text mb-2">
                        Exercise Name
                    </label>
                    <input
                        type="text"
                        value={exerciseName}
                        onChange={(e) => setExerciseName(e.target.value)}
                        placeholder="Enter exercise name"
                        className="w-full p-3 rounded-lg bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        autoFocus
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-brand-secondary-text mb-2">
                        Primary Muscle Group
                    </label>
                    <select 
                        value={primaryMuscle} 
                        onChange={e => setPrimaryMuscle(e.target.value)} 
                        className="w-full p-3 rounded-lg bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        <option value="">Select primary muscle</option>
                        {muscleGroups.map(group => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-brand-secondary-text mb-2">
                        Secondary Muscle 1 (Optional)
                    </label>
                    <select 
                        value={secondaryMuscle1} 
                        onChange={e => setSecondaryMuscle1(e.target.value)} 
                        className="w-full p-3 rounded-lg bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        <option value="">Select secondary muscle</option>
                        {muscleGroups.filter(group => group !== primaryMuscle).map(group => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-semibold text-brand-secondary-text mb-2">
                        Secondary Muscle 2 (Optional)
                    </label>
                    <select 
                        value={secondaryMuscle2} 
                        onChange={e => setSecondaryMuscle2(e.target.value)} 
                        className="w-full p-3 rounded-lg bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        <option value="">Select secondary muscle</option>
                        {muscleGroups.filter(group => group !== primaryMuscle && group !== secondaryMuscle1).map(group => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex space-x-3">
                    <button
                        onClick={onBack}
                        className="flex-1 py-3 bg-brand-surface-alt hover:bg-brand-border text-brand-primary font-semibold rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!exerciseName.trim() || !primaryMuscle}
                        className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary-dark text-brand-primary-text font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Exercise
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExerciseCard: React.FC<{
    loggedExercise: LoggedExercise;
    onLogSet: (exerciseId: string, variation: 'Bilateral' | 'Unilateral', newSet: ExerciseSet) => void;
    onUpdateBrand: (exerciseId: string, brand: string) => void;
    onRemove: (exerciseId: string) => void;
    customExercises: Exercise[];
    onPersonalRecord: (info: { exerciseName: string; weight: number; variation: 'Bilateral' | 'Unilateral' }) => void;
}> = ({ loggedExercise, onLogSet, onUpdateBrand, onRemove, customExercises, onPersonalRecord }) => {
    const [variation, setVariation] = useState<'Bilateral' | 'Unilateral'>('Bilateral');
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [usePin, setUsePin] = useState(false);
    const [pinWeight, setPinWeight] = useState('');

    const { currentUser } = useAuth();
    const { getHighestWeight } = useWorkout();

    // Look for exercise in both built-in and custom exercises
    const exerciseInfo = EXERCISES.find(e => e.id === loggedExercise.exerciseId) ||
                        customExercises.find(e => e.id === loggedExercise.exerciseId);
    if (!exerciseInfo) return null;

    const handleAddSet = () => {
        const weightNum = parseFloat(weight);
        const repsNum = parseInt(reps, 10);
        const pinWeightNum = usePin ? parseFloat(pinWeight) : 0;

        if (weightNum > 0 && repsNum > 0 && currentUser) {
            const currentPR = getHighestWeight(currentUser.id, loggedExercise.exerciseId, variation);
            const totalWeight = weightNum + pinWeightNum;
            const isNewPR = totalWeight > currentPR;

            onLogSet(loggedExercise.id, variation, { 
                id: Date.now().toString(), 
                weight: weightNum, 
                reps: repsNum, 
                pinWeight: pinWeightNum > 0 ? pinWeightNum : undefined,
                isPR: isNewPR 
            });

            if (isNewPR) {
                onPersonalRecord({
                    exerciseName: exerciseInfo.name,
                    weight: totalWeight,
                    variation,
                });
            }
            setWeight('');
            setReps('');
            setPinWeight('');
            setUsePin(false);
        }
    };
    
    const setsForVariation = loggedExercise.variation === variation ? loggedExercise.sets : [];

    return (
        <div className="bg-brand-surface p-4 rounded-lg mb-4 relative">
            <button 
                onClick={() => onRemove(loggedExercise.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm transition-colors"
            >
                ×
            </button>
            <div className="flex items-center mb-3">
                <PlaceholderIcon />
                <h3 className="text-lg font-semibold ml-3">{exerciseInfo.name}</h3>
                {exerciseInfo.id.startsWith('custom-') && (
                    <span className="ml-2 text-xs bg-brand-primary text-brand-primary-text px-2 py-1 rounded">Custom</span>
                )}
            </div>
            
            <div className="mb-3">
                <label className="block mb-2 text-xs font-semibold text-brand-secondary-text">Equipment Brand</label>
                <select 
                    value={loggedExercise.brand} 
                    onChange={e => onUpdateBrand(loggedExercise.id, e.target.value)} 
                    className="w-full p-2 text-sm rounded bg-brand-surface-alt border border-brand-border disabled:opacity-50"
                    disabled={loggedExercise.sets.length > 0}
                >
                    {GYM_BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>
            </div>

            <div className="flex space-x-2 mb-3">
                <button onClick={() => setVariation('Bilateral')} className={`w-full py-2 text-sm font-semibold rounded ${variation === 'Bilateral' ? 'bg-brand-primary text-brand-primary-text' : 'bg-brand-surface-alt'}`}>Bilateral</button>
                <button onClick={() => setVariation('Unilateral')} className={`w-full py-2 text-sm font-semibold rounded ${variation === 'Unilateral' ? 'bg-brand-primary text-brand-primary-text' : 'bg-brand-surface-alt'}`}>Unilateral</button>
            </div>
            
            <div className="space-y-2 mb-3">
                {setsForVariation.map((s, i) => (
                    <div key={s.id} className="flex justify-between items-center bg-brand-bg p-2 rounded">
                        <span className="font-mono text-sm">Set {i+1}</span>
                        <span className="font-mono text-sm">{s.weight}kg {s.pinWeight ? `+ ${s.pinWeight}kg` : ''} x {s.reps}</span>
                        {s.isPR && <span className="text-xs font-bold bg-brand-border text-brand-primary-text px-2 py-1 rounded-full">PR!</span>}
                    </div>
                ))}
            </div>

            <div className="flex space-x-2">
                <input type="number" placeholder="kg" value={weight} onChange={e => setWeight(e.target.value)} className="w-1/2 p-2 rounded bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                <input type="number" placeholder="Reps" value={reps} onChange={e => setReps(e.target.value)} className="w-1/2 p-2 rounded bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
             <div className="flex items-center mt-3">
                <input type="checkbox" id={`usePin-${loggedExercise.id}`} checked={usePin} onChange={(e) => setUsePin(e.target.checked)} className="mr-2" />
                <label htmlFor={`usePin-${loggedExercise.id}`} className="text-sm">Use Gym Pin</label>
            </div>
            {usePin && (
                <div className="mt-2">
                     <input type="number" placeholder="Pin Weight (kg)" value={pinWeight} onChange={e => setPinWeight(e.target.value)} className="w-full p-2 rounded bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
            )}
            <button onClick={handleAddSet} className="w-full mt-3 py-2 bg-brand-secondary hover:bg-brand-primary text-brand-primary-text font-bold rounded transition-colors">Add Set</button>
        </div>
    );
};


interface GymBranch {
    id: string;
    name: string;
    gym_name: string;
    address?: string;
}

const NewWorkout: React.FC<{ 
    onFinishWorkout: () => void; 
    onBack: () => void;
}> = ({ onFinishWorkout, onBack }) => {
    const { currentUser } = useAuth();
    const [gymBranches, setGymBranches] = useState<GymBranch[]>([]);
    const [showAddGymModal, setShowAddGymModal] = useState(false);
    // Persistent workout state - survives browser/tab closure and phone screen locks
    const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>(() => {
        try {
            const saved = localStorage.getItem(`workout_session_${currentUser?.id}`);
            const restoredData = saved ? JSON.parse(saved) : [];
            // Show notification if workout was restored
            if (restoredData.length > 0) {
                console.log('🔄 Workout session restored from previous session');
            }
            return restoredData;
        } catch {
            return [];
        }
    });
    const [selectedGymBranch, setSelectedGymBranchState] = useState<string>(() => {
        try {
            const saved = localStorage.getItem(`workout_gym_${currentUser?.id}`);
            return saved ? JSON.parse(saved) : '';
        } catch {
            return '';
        }
    });
    
    const [isPostModalOpen, setPostModalOpen] = useState(false);
    const [finishedWorkoutId, setFinishedWorkoutId] = useState<string | null>(null);
    const [isFinishing, setIsFinishing] = useState(false);
    
    // Modal state management
    const [modalState, setModalState] = useState<'closed' | 'exercise' | 'custom-exercise'>('closed');
    const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
    const [prCelebration, setPrCelebration] = useState<{
        exerciseName: string;
        weight: number;
        variation: 'Bilateral' | 'Unilateral';
    } | null>(null);
    const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Custom setter that persists to localStorage
    const setSelectedGymBranch = (branch: string) => {
        setSelectedGymBranchState(branch);
        if (currentUser?.id) {
            localStorage.setItem(`workout_gym_${currentUser.id}`, JSON.stringify(branch));
        }
    };

    // Persist workout state whenever it changes
    useEffect(() => {
        if (currentUser?.id) {
            localStorage.setItem(`workout_session_${currentUser.id}`, JSON.stringify(loggedExercises));
        }
    }, [loggedExercises, currentUser?.id]);

    const { addWorkout } = useWorkout();

    // Fetch available gym branches on component mount
    useEffect(() => {
        const fetchGymBranches = async () => {
            try {
                const response = await api.get('/gyms/branches');
                setGymBranches(response.data as GymBranch[]);
                // Only set default if no gym is already selected (from persistence)
                if ((response.data as GymBranch[]).length > 0 && !selectedGymBranch) {
                    setSelectedGymBranch((response.data as GymBranch[])[0].id);
                }
            } catch (error) {
                console.error('Error fetching gym branches:', error);
                // Fallback to constants if API fails
                const fallbackBranches = GYMS.map((gym, index) => ({
                    id: `fallback-${index}`,
                    name: gym,
                    gym_name: 'ArkGrit'
                }));
                setGymBranches(fallbackBranches);
                if (fallbackBranches.length > 0) {
                    setSelectedGymBranch(fallbackBranches[0].id);
                }
            }
        };
        
        fetchGymBranches();
    }, []);

    const handleGymAdded = (newBranch: GymBranch) => {
        setGymBranches(prev => [...prev, newBranch]);
        setSelectedGymBranch(newBranch.id);
        setShowAddGymModal(false);
    };

    // Fetch custom exercises on component mount
    useEffect(() => {
        const fetchCustomExercises = async () => {
            if (currentUser) {
                try {
                    const response = await api.get(`/users/custom-exercises`);
                    setCustomExercises((response.data as Exercise[]) || []);
                } catch (error) {
                    console.error('Error fetching custom exercises:', error);
                }
            }
        };
        
        fetchCustomExercises();
    }, [currentUser]);

    const playCelebrationSound = useCallback(() => {
        try {
            const AudioContextClass =
                window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) {
                return;
            }

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContextClass();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);

            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.6);
        } catch (error) {
            console.warn('PR celebration sound failed:', error);
        }
    }, []);

    const triggerCelebration = useCallback(
        (details: { exerciseName: string; weight: number; variation: 'Bilateral' | 'Unilateral' }) => {
            setPrCelebration(details);
            playCelebrationSound();

            if (celebrationTimeoutRef.current) {
                clearTimeout(celebrationTimeoutRef.current);
            }
            celebrationTimeoutRef.current = setTimeout(() => {
                setPrCelebration(null);
            }, 2200);
        },
        [playCelebrationSound],
    );

    useEffect(() => {
        return () => {
            if (celebrationTimeoutRef.current) {
                clearTimeout(celebrationTimeoutRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const styleId = 'pr-celebration-keyframes';
        if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes pr-pop {
                    0% { transform: scale(0.6); opacity: 0; }
                    60% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const addExerciseToSession = (exercise: Exercise) => {
        setModalState('closed');
        const newLoggedExercise: LoggedExercise = {
            id: `${exercise.id}-${Date.now()}`,
            exerciseId: exercise.id,
            brand: GYM_BRANDS[0],
            variation: 'Bilateral',
            sets: [],
        };
        setLoggedExercises(prev => [...prev, newLoggedExercise]);
    };

    const handleCustomExerciseSave = async (exercise: Exercise) => {
        try {
            // Save to backend
            const response = await api.post('/users/custom-exercises', exercise);
            const savedExercise = response.data as Exercise;
            
            // Update local state
            setCustomExercises(prev => [...prev, savedExercise]);
            
            // Add to session
            addExerciseToSession(savedExercise);
        } catch (error) {
            console.error('Error saving custom exercise:', error);
            // Still add to local session even if save fails
            setCustomExercises(prev => [...prev, exercise]);
            addExerciseToSession(exercise);
        }
        setModalState('closed');
    };

    const handleUpdateBrand = (loggedExerciseId: string, brand: string) => {
        setLoggedExercises(prev => prev.map(ex => ex.id === loggedExerciseId ? { ...ex, brand } : ex));
    };

    const handleRemoveExercise = (loggedExerciseId: string) => {
        setLoggedExercises(prev => prev.filter(ex => ex.id !== loggedExerciseId));
    };

    const handleLogSet = (loggedExerciseId: string, variation: 'Bilateral' | 'Unilateral', set: ExerciseSet) => {
        setLoggedExercises(prev => {
            return prev.map(ex => {
                if (ex.id === loggedExerciseId) {
                    const isNewVariation = ex.variation !== variation;
                    const newSets = isNewVariation ? [set] : [...ex.sets, set];
                    return { ...ex, variation, sets: newSets };
                }
                return ex;
            });
        });
    };

    const handleFinishWorkout = async () => {
        const exercisesWithSets = loggedExercises.filter(ex => ex.sets.length > 0);
        if (currentUser && exercisesWithSets.length > 0) {
            setIsFinishing(true);
            const selectedBranch = gymBranches.find(b => b.id === selectedGymBranch);
            const newWorkout: Workout = {
                id: Date.now().toString(),
                userId: currentUser.id,
                date: new Date().toISOString(),
                branch: selectedBranch?.name || 'Unknown Gym',
                exercises: exercisesWithSets,
            };
            await addWorkout(newWorkout);
            setFinishedWorkoutId(newWorkout.id);
            setPostModalOpen(true);
            setIsFinishing(false);
            // Clear the session since workout is completed
            clearWorkoutSession();
        } else {
            onFinishWorkout(); 
        }
    };
    
    const clearWorkoutSession = () => {
        if (currentUser?.id) {
            localStorage.removeItem(`workout_session_${currentUser.id}`);
            localStorage.removeItem(`workout_gym_${currentUser.id}`);
        }
        setLoggedExercises([]);
        setSelectedGymBranchState('');
    };

    const closePostModal = () => {
        setPostModalOpen(false);
        clearWorkoutSession();
        onFinishWorkout();
    };

    const handleBackButton = () => {
        // Only clear if there are no exercises logged
        if (loggedExercises.length === 0) {
            clearWorkoutSession();
        }
        onBack();
    };

    return (
        <div>
            {prCelebration && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                    <div className="relative flex items-center justify-center">
                        <span
                            className="absolute w-4 h-4 bg-yellow-300 rounded-full animate-ping"
                            style={{ top: '-3.5rem', left: '50%', transform: 'translateX(-50%)', animationDuration: '1s' }}
                        />
                        <span
                            className="absolute w-3 h-3 bg-yellow-200 rounded-full animate-ping"
                            style={{ top: '50%', left: '-3.5rem', animationDelay: '0.15s', animationDuration: '1.1s' }}
                        />
                        <span
                            className="absolute w-3 h-3 bg-yellow-200 rounded-full animate-ping"
                            style={{ top: '50%', right: '-3.5rem', animationDelay: '0.25s', animationDuration: '1.1s' }}
                        />
                        <span
                            className="absolute w-2 h-2 bg-yellow-100 rounded-full animate-ping"
                            style={{ bottom: '-3rem', left: '50%', transform: 'translateX(-50%)', animationDelay: '0.35s', animationDuration: '1.2s' }}
                        />
                        <div className="relative flex flex-col items-center justify-center px-10 py-8 bg-black/80 rounded-3xl border border-yellow-300 shadow-2xl backdrop-blur-md animate-[pr-pop_0.4s_ease-out]">
                            <div
                                className="text-6xl font-black text-yellow-300 mb-2 drop-shadow-lg"
                                style={{ textShadow: '0 0 16px rgba(250, 204, 21, 0.85)' }}
                            >
                                PR!
                            </div>
                            <p className="text-brand-primary-text text-center font-semibold">
                                {prCelebration.exerciseName}
                                <span className="block text-sm text-yellow-200 mt-1">
                                    {prCelebration.weight.toFixed(1)}kg • {prCelebration.variation}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Modals */}
            {modalState === 'exercise' && (
                <UnifiedExerciseSelectionModal 
                    onSelect={addExerciseToSession}
                    onClose={() => setModalState('closed')}
                    onAddCustom={() => setModalState('custom-exercise')}
                    customExercises={customExercises}
                />
            )}
            {modalState === 'custom-exercise' && (
                <CustomExerciseModal 
                    onSave={handleCustomExerciseSave}
                    onBack={() => setModalState('exercise')}
                    onClose={() => setModalState('closed')}
                />
            )}
            {isPostModalOpen && finishedWorkoutId && <PostWorkoutModal onClose={closePostModal} workoutId={finishedWorkoutId} />}
            {showAddGymModal && <AddGymModal onClose={() => setShowAddGymModal(false)} onGymAdded={handleGymAdded} />}
            
            <div className="flex items-center justify-between mb-4">
                <BackButton onClick={handleBackButton} />
                <h2 className="text-2xl font-bold">New Workout</h2>
                <div></div> {/* Spacer for centering */}
            </div>
            
            <div className="mb-4">
                <label className="block mb-2 text-sm font-semibold">Gym</label>
                <div className="flex gap-2">
                    <select 
                        value={selectedGymBranch} 
                        onChange={e => setSelectedGymBranch(e.target.value)} 
                        className="flex-1 p-2 rounded bg-brand-surface border border-brand-border"
                    >
                        {gymBranches.map(branch => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                    <button 
                        onClick={() => setShowAddGymModal(true)}
                        className="px-3 py-2 bg-brand-secondary text-brand-primary-text rounded hover:bg-brand-primary transition-colors text-sm font-semibold"
                    >
                        + Add Gym
                    </button>
                </div>
            </div>

            {loggedExercises.map(ex => (
                <ExerciseCard 
                    key={ex.id} 
                    loggedExercise={ex}
                    onLogSet={handleLogSet}
                    onUpdateBrand={handleUpdateBrand}
                    onRemove={handleRemoveExercise}
                    customExercises={customExercises}
                    onPersonalRecord={triggerCelebration}
                />
            ))}
            
            <button onClick={() => setModalState('exercise')} className="w-full mt-4 py-3 border-2 border-dashed border-brand-border hover:border-brand-primary text-brand-secondary-text hover:text-brand-primary font-bold rounded-lg transition-colors">
                Add Exercise
            </button>
            <button 
                onClick={handleFinishWorkout}
                disabled={isFinishing}
                className="w-full mt-4 py-3 bg-brand-primary hover:bg-brand-secondary text-brand-primary-text font-bold rounded-lg transition-colors disabled:bg-brand-surface-alt disabled:cursor-wait"
            >
                {isFinishing ? 'Saving...' : 'Finish Workout'}
            </button>
        </div>
    );
};

const AddGymModal: React.FC<{
    onClose: () => void;
    onGymAdded: (branch: GymBranch) => void;
}> = ({ onClose, onGymAdded }) => {
    const [gymName, setGymName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gymName.trim() || !branchName.trim()) {
            setError('Gym name and branch name are required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Create gym first
            const gymResponse = await api.post('/gyms', { name: gymName.trim() });
            const newGym = gymResponse.data;

            // Then add branch to the gym
            const branchResponse = await api.post(`/gyms/${(newGym as any).id}/branches`, {
                name: branchName.trim(),
                address: address.trim() || undefined
            });

            const newBranch: GymBranch = {
                id: (branchResponse.data as any).id,
                name: (branchResponse.data as any).fullName,
                gym_name: gymName.trim(),
                address: (branchResponse.data as any).address
            };

            onGymAdded(newBranch);
        } catch (error: any) {
            console.error('Error adding gym:', error);
            setError(error.response?.data?.error || 'Failed to add gym');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-surface rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Add New Gym</h3>
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-semibold">Gym Name</label>
                        <input
                            type="text"
                            value={gymName}
                            onChange={e => setGymName(e.target.value)}
                            placeholder="e.g., MyFitness, Gold's Gym"
                            className="w-full p-2 rounded bg-brand-bg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-semibold">Branch/Location Name</label>
                        <input
                            type="text"
                            value={branchName}
                            onChange={e => setBranchName(e.target.value)}
                            placeholder="e.g., Downtown, Mall Branch"
                            className="w-full p-2 rounded bg-brand-bg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-semibold">Address (Optional)</label>
                        <input
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="Street address"
                            className="w-full p-2 rounded bg-brand-bg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 bg-brand-bg border border-brand-border text-brand-secondary-text rounded hover:bg-brand-surface-alt transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-brand-primary text-brand-primary-text rounded hover:bg-brand-secondary transition-colors disabled:bg-brand-surface-alt disabled:cursor-wait"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Gym'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewWorkout;
