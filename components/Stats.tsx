import React, { useState, useMemo } from 'react';
import { EXERCISES } from '../constants';
import ProgressChart from './ProgressChart';
import { PlaceholderIcon } from './icons';
import { useWorkout } from '../context/WorkoutContext';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BodyWeightEntry, Exercise, Workout } from '../types';
import { BackButton } from './common';

type StatsView = 'BODY' | 'STRENGTH' | 'HISTORY';

const EditWorkoutModal: React.FC<{
    workout: Workout;
    onSave: (workout: Workout) => void;
    onCancel: () => void;
}> = ({ workout, onSave, onCancel }) => {
    const [editedWorkout, setEditedWorkout] = useState<Workout>({ ...workout });

    const handleSave = () => {
        onSave(editedWorkout);
    };

    const handleExerciseChange = (exerciseIndex: number, field: string, value: any) => {
        setEditedWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.map((ex, index) => 
                index === exerciseIndex ? { ...ex, [field]: value } : ex
            )
        }));
    };

    const handleSetChange = (exerciseIndex: number, setIndex: number, field: string, value: any) => {
        setEditedWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.map((ex, exIndex) => 
                exIndex === exerciseIndex 
                    ? {
                        ...ex,
                        sets: ex.sets.map((set, sIndex) => 
                            sIndex === setIndex ? { ...set, [field]: value } : set
                        )
                    }
                    : ex
            )
        }));
    };

    const addSet = (exerciseIndex: number) => {
        const lastSet = editedWorkout.exercises[exerciseIndex].sets.slice(-1)[0];
        const newSet = {
            id: `new-${Date.now()}-${Math.random()}`,
            weight: lastSet?.weight || 0,
            reps: lastSet?.reps || 0,
            pinWeight: lastSet?.pinWeight,
            isPR: false
        };

        setEditedWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.map((ex, index) => 
                index === exerciseIndex 
                    ? { ...ex, sets: [...ex.sets, newSet] }
                    : ex
            )
        }));
    };

    const removeSet = (exerciseIndex: number, setIndex: number) => {
        setEditedWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.map((ex, index) => 
                index === exerciseIndex 
                    ? { ...ex, sets: ex.sets.filter((_, sIndex) => sIndex !== setIndex) }
                    : ex
            )
        }));
    };

    const findExerciseName = (id: string) => EXERCISES.find(e => e.id === id)?.name || 'Unknown Exercise';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-brand-border">
                    <h2 className="text-xl font-bold">Edit Workout</h2>
                    <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">Date</label>
                        <input
                            type="date"
                            value={editedWorkout.date}
                            onChange={(e) => setEditedWorkout(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full p-2 border border-brand-border rounded-lg bg-brand-surface"
                        />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">Branch</label>
                        <input
                            type="text"
                            value={editedWorkout.branch}
                            onChange={(e) => setEditedWorkout(prev => ({ ...prev, branch: e.target.value }))}
                            className="w-full p-2 border border-brand-border rounded-lg bg-brand-surface"
                        />
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {editedWorkout.exercises.map((exercise, exerciseIndex) => (
                        <div key={exercise.id} className="border border-brand-border rounded-lg p-4">
                            <h3 className="font-semibold text-lg mb-4">
                                {findExerciseName(exercise.exerciseId)} - {exercise.variation} ({exercise.brand})
                            </h3>
                            
                            <div className="space-y-2">
                                {exercise.sets.map((set, setIndex) => (
                                    <div key={set.id} className="flex items-center gap-2 p-2 bg-brand-surface rounded">
                                        <span className="text-sm font-medium w-12">Set {setIndex + 1}</span>
                                        <input
                                            type="number"
                                            placeholder="Weight"
                                            value={set.weight}
                                            onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                                            className="w-20 p-1 border border-brand-border rounded text-center"
                                        />
                                        <span className="text-sm">kg</span>
                                        {set.pinWeight !== undefined && (
                                            <>
                                                <span className="text-sm">+</span>
                                                <input
                                                    type="number"
                                                    placeholder="Pin"
                                                    value={set.pinWeight || ''}
                                                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'pinWeight', parseFloat(e.target.value) || undefined)}
                                                    className="w-16 p-1 border border-brand-border rounded text-center"
                                                />
                                                <span className="text-sm">kg</span>
                                            </>
                                        )}
                                        <span className="text-sm">×</span>
                                        <input
                                            type="number"
                                            placeholder="Reps"
                                            value={set.reps}
                                            onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                                            className="w-16 p-1 border border-brand-border rounded text-center"
                                        />
                                        <span className="text-sm">reps</span>
                                        <label className="flex items-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={set.isPR}
                                                onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'isPR', e.target.checked)}
                                            />
                                            <span className="text-sm">PR</span>
                                        </label>
                                        {exercise.sets.length > 1 && (
                                            <button
                                                onClick={() => removeSet(exerciseIndex, setIndex)}
                                                className="ml-2 p-1 text-red-500 hover:bg-red-100 rounded"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => addSet(exerciseIndex)}
                                    className="w-full p-2 border-2 border-dashed border-brand-border rounded-lg text-brand-secondary-text hover:bg-brand-surface transition-colors"
                                >
                                    + Add Set
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-brand-border flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 p-3 border border-brand-border rounded-lg hover:bg-brand-surface transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 p-3 bg-brand-primary text-brand-primary-text rounded-lg hover:bg-brand-secondary transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const WorkoutHistoryItem: React.FC<{ workout: Workout; onEdit: (workout: Workout) => void; onDelete: (workoutId: string) => void }> = ({ workout, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const findExerciseName = (id: string) => EXERCISES.find(e => e.id === id)?.name || 'Unknown Exercise';

    const handleDelete = () => {
        onDelete(workout.id);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="bg-brand-surface rounded-lg overflow-hidden">
            <div className="flex items-center">
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex-1 text-left p-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{new Date(workout.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="text-sm text-brand-secondary-text">{workout.branch}</p>
                    </div>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>&#9660;</span>
                </button>
                <div className="flex gap-2 pr-4">
                    <button
                        onClick={() => onEdit(workout)}
                        className="p-2 text-brand-secondary-text hover:text-brand-primary hover:bg-brand-surface-alt rounded-lg transition-colors"
                        title="Edit workout"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-brand-secondary-text hover:text-red-500 hover:bg-brand-surface-alt rounded-lg transition-colors"
                        title="Delete workout"
                    >
                        🗑️
                    </button>
                </div>
            </div>
            
            {showDeleteConfirm && (
                <div className="px-4 pb-4 border-t border-brand-border bg-red-50">
                    <div className="flex items-center justify-between py-3">
                        <span className="text-sm font-medium text-red-800">Delete this workout?</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isExpanded && (
                <div className="p-4 border-t border-brand-border">
                    {workout.exercises.map(ex => (
                        <div key={ex.id} className="mb-4 last:mb-0">
                            <div className="flex items-center mb-2">
                                <PlaceholderIcon />
                                <div className="ml-3">
                                    <h5 className="font-semibold">{findExerciseName(ex.exerciseId)}</h5>
                                    <p className="text-xs text-brand-secondary-text">{ex.variation} - {ex.brand}</p>
                                </div>
                            </div>
                            <ul className="space-y-1 pl-2 border-l-2 border-brand-surface-alt ml-5">
                                {ex.sets.map((set, index) => (
                                    <li key={set.id} className="flex justify-between items-center text-sm ml-2">
                                        <span>Set {index + 1}</span>
                                        <span className="font-mono">{set.weight}kg {set.pinWeight ? `+ ${set.pinWeight}kg` : ''} x {set.reps} reps</span>
                                        {set.isPR && <span className="text-xs font-bold text-brand-primary-text bg-brand-border px-1 rounded">PR!</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const WorkoutHistory: React.FC = () => {
    const { currentUser } = useAuth();
    const { getWorkoutsByUserId, updateWorkout, deleteWorkout } = useWorkout();
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

    if (!currentUser) return null;
    
    const userWorkouts = getWorkoutsByUserId(currentUser.id);

    const handleEdit = (workout: Workout) => {
        setEditingWorkout(workout);
    };

    const handleDelete = async (workoutId: string) => {
        try {
            await deleteWorkout(workoutId);
        } catch (error) {
            console.error('Failed to delete workout:', error);
            alert('Failed to delete workout. Please try again.');
        }
    };

    const handleUpdateWorkout = async (updatedWorkout: Workout) => {
        try {
            await updateWorkout(editingWorkout!.id, updatedWorkout);
            setEditingWorkout(null);
        } catch (error) {
            console.error('Failed to update workout:', error);
            alert('Failed to update workout. Please try again.');
        }
    };

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Workout History</h3>
            {userWorkouts.length > 0 ? (
                <div className="space-y-4">
                    {userWorkouts.map(workout => (
                        <WorkoutHistoryItem 
                            key={workout.id} 
                            workout={workout} 
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-brand-secondary-text text-center">No workouts logged yet.</p>
            )}

            {/* Edit Workout Modal */}
            {editingWorkout && (
                <EditWorkoutModal
                    workout={editingWorkout}
                    onSave={handleUpdateWorkout}
                    onCancel={() => setEditingWorkout(null)}
                />
            )}
        </div>
    );
};

const WorkoutHistoryTable: React.FC<{
    exerciseId: string;
    variation: 'Bilateral' | 'Unilateral';
    brand: string;
}> = ({ exerciseId, variation, brand }) => {
    const { currentUser } = useAuth();
    const { getWorkoutsByUserId } = useWorkout();

    if (!currentUser) return null;

    const userWorkouts = getWorkoutsByUserId(currentUser.id);

    const history = userWorkouts
        .flatMap(workout =>
            workout.exercises
                .filter(ex => ex.exerciseId === exerciseId && ex.variation === variation && ex.brand === brand)
                .flatMap(ex => ex.sets.map(set => ({
                    id: set.id,
                    date: new Date(workout.date).toLocaleDateString('en-CA'),
                    weight: set.weight,
                    pinWeight: set.pinWeight,
                    reps: set.reps,
                })))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (history.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 max-h-48 overflow-y-auto rounded-lg">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-brand-secondary-text uppercase bg-brand-surface sticky top-0">
                    <tr>
                        <th scope="col" className="px-4 py-2">Date</th>
                        <th scope="col" className="px-4 py-2">Weight (kg)</th>
                        <th scope="col" className="px-4 py-2">Reps</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((entry) => (
                        <tr key={entry.id} className="bg-brand-surface-alt border-b border-brand-border last:border-b-0">
                            <td className="px-4 py-2 font-mono">{entry.date}</td>
                            <td className="px-4 py-2 font-mono">{entry.weight}{entry.pinWeight ? ` + ${entry.pinWeight}` : ''}</td>
                            <td className="px-4 py-2 font-mono">{entry.reps}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const BodyWeightChart: React.FC<{data: BodyWeightEntry[]}> = ({ data }) => {
    if (data.length === 0) {
        return <p className="text-brand-secondary-text text-center py-4">No body weight data yet.</p>;
    }

    const chartData = data.map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-CA'),
        weight: entry.weight,
    })).reverse();

    return (
        <div className="bg-brand-surface p-2 rounded-lg h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="date" stroke="#A0AEC0" fontSize={12} />
                    <YAxis stroke="#A0AEC0" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} 
                      labelStyle={{ color: '#FFFFFF' }}
                    />
                    <Legend wrapperStyle={{fontSize: "14px"}}/>
                    <Line type="monotone" dataKey="weight" stroke="#ffffff" strokeWidth={2} activeDot={{ r: 8 }} name="Body Weight (kg)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

const BodyWeightHistoryTable: React.FC<{ data: BodyWeightEntry[] }> = ({ data }) => {
    if (data.length === 0) {
        return null;
    }

    const reversedData = [...data].reverse();

    return (
        <div className="mt-4 max-h-48 overflow-y-auto rounded-lg">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-brand-secondary-text uppercase bg-brand-surface sticky top-0">
                    <tr>
                        <th scope="col" className="px-4 py-2">Date</th>
                        <th scope="col" className="px-4 py-2">Weight (kg)</th>
                    </tr>
                </thead>
                <tbody>
                    {reversedData.map((entry) => (
                        <tr key={entry.id} className="bg-brand-surface-alt border-b border-brand-border last:border-b-0">
                            <td className="px-4 py-2 font-mono">{new Date(entry.date).toLocaleDateString('en-CA')}</td>
                            <td className="px-4 py-2 font-mono">{entry.weight.toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const BodyStats: React.FC = () => {
    const { currentUser } = useAuth();
    const { addBodyWeightEntry, getBodyWeightEntriesByUserId } = useWorkout();
    const [weight, setWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!currentUser) return null;

    const userWeightData = getBodyWeightEntriesByUserId(currentUser.id);

    const handleAddWeight = async (e: React.FormEvent) => {
        e.preventDefault();
        const weightNum = parseFloat(weight);
        if (weightNum > 0 && currentUser) {
            setIsSubmitting(true);
            const newEntry: BodyWeightEntry = {
                id: Date.now().toString(),
                userId: currentUser.id,
                date: new Date().toISOString(),
                weight: weightNum,
            };
            await addBodyWeightEntry(newEntry);
            setWeight('');
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Body Weight Tracker</h3>
            <form onSubmit={handleAddWeight} className="flex gap-2 mb-4">
                <input 
                    type="number"
                    step="0.1"
                    placeholder="Enter weight in kg"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="flex-grow p-2 rounded bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    disabled={isSubmitting}
                />
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-brand-primary text-brand-primary-text font-bold rounded disabled:bg-brand-surface-alt"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? '...' : 'Log'}
                </button>
            </form>
            <BodyWeightChart data={userWeightData} />
            <BodyWeightHistoryTable data={userWeightData} />
        </div>
    )
}

const StrengthStats: React.FC = () => {
    const { currentUser } = useAuth();
    const { getWorkoutsByUserId } = useWorkout();

    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

    const userWorkouts = useMemo(() => currentUser ? getWorkoutsByUserId(currentUser.id) : [], [currentUser, getWorkoutsByUserId]);

    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        userWorkouts.forEach(w => w.exercises.forEach(e => brands.add(e.brand)));
        return Array.from(brands).sort();
    }, [userWorkouts]);

    const availableMuscleGroups = useMemo(() => {
        if (!selectedBrand) return [];
        const muscleGroups = new Set<string>();
        const exercisesInBrand = new Set<string>();

        userWorkouts.forEach(w => w.exercises.forEach(e => {
            if (e.brand === selectedBrand) {
                exercisesInBrand.add(e.exerciseId);
            }
        }));

        EXERCISES.forEach(ex => {
            if (exercisesInBrand.has(ex.id)) {
                muscleGroups.add(ex.muscleGroup);
            }
        });

        return Array.from(muscleGroups).sort();
    }, [userWorkouts, selectedBrand]);

    const availableExercises = useMemo(() => {
        if (!selectedBrand || !selectedMuscleGroup) return [];
        const exercisesInGroup = new Set<string>();
        
        userWorkouts.forEach(w => w.exercises.forEach(e => {
            if (e.brand === selectedBrand) {
                exercisesInGroup.add(e.exerciseId);
            }
        }));

        return EXERCISES
            .filter(ex => ex.muscleGroup === selectedMuscleGroup && exercisesInGroup.has(ex.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [userWorkouts, selectedBrand, selectedMuscleGroup]);
    
    const resetSelection = (level: 'brand' | 'group' | 'exercise') => {
        setSelectedExercise(null);
        if (level === 'brand' || level === 'group') setSelectedMuscleGroup(null);
        if (level === 'brand') setSelectedBrand(null);
    }
    
    const renderBreadcrumbs = () => (
        <div className="text-sm text-brand-secondary-text mb-4 flex items-center flex-wrap">
            <button onClick={() => resetSelection('brand')} className="hover:text-brand-primary">Strength</button>
            {selectedBrand && (
                <>
                    <span className="mx-2">&gt;</span>
                    <button onClick={() => resetSelection('group')} className="hover:text-brand-primary">{selectedBrand}</button>
                </>
            )}
            {selectedMuscleGroup && (
                <>
                    <span className="mx-2">&gt;</span>
                    <button onClick={() => resetSelection('exercise')} className="hover:text-brand-primary">{selectedMuscleGroup}</button>
                </>
            )}
            {selectedExercise && <span className="mx-2">&gt;</span>}
            {selectedExercise && <span className="font-semibold text-brand-primary">{selectedExercise.name}</span>}
        </div>
    );
    
    const ListItem: React.FC<{children: React.ReactNode, onClick: () => void}> = ({ children, onClick }) => (
        <button onClick={onClick} className="w-full text-left p-3 rounded-lg bg-brand-surface hover:bg-brand-surface-alt flex items-center transition-colors">
           <PlaceholderIcon />
           <span className="ml-3 font-semibold">{children}</span>
        </button>
    );

    if (!selectedBrand) {
        return (<div>{renderBreadcrumbs()}<div className="space-y-2">{availableBrands.map(b => <ListItem key={b} onClick={() => setSelectedBrand(b)}>{b}</ListItem>)}</div></div>);
    }
    if (!selectedMuscleGroup) {
        return (<div>{renderBreadcrumbs()}<div className="space-y-2">{availableMuscleGroups.map(mg => <ListItem key={mg} onClick={() => setSelectedMuscleGroup(mg)}>{mg}</ListItem>)}</div></div>);
    }
    if (!selectedExercise) {
        return (<div>{renderBreadcrumbs()}<div className="space-y-2">{availableExercises.map(ex => <ListItem key={ex.id} onClick={() => setSelectedExercise(ex)}>{ex.name}</ListItem>)}</div></div>);
    }

    return (
        <div>
            {renderBreadcrumbs()}
            <h3 className="text-xl font-semibold my-4 flex items-center">
                <PlaceholderIcon />
                <span className="ml-3">{selectedExercise.name}</span>
            </h3>
            <div className="mb-6">
                <h5 className="font-semibold text-lg mb-2">Bilateral Progress</h5>
                <ProgressChart exerciseId={selectedExercise.id} variation="Bilateral" brand={selectedBrand} />
                <WorkoutHistoryTable exerciseId={selectedExercise.id} variation="Bilateral" brand={selectedBrand} />
            </div>
            <div>
                <h5 className="font-semibold text-lg mb-2">Unilateral Progress</h5>
                <ProgressChart exerciseId={selectedExercise.id} variation="Unilateral" brand={selectedBrand} />
                <WorkoutHistoryTable exerciseId={selectedExercise.id} variation="Unilateral" brand={selectedBrand} />
            </div>
        </div>
    );
}

const Stats: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeView, setActiveView] = useState<StatsView>('STRENGTH');
    const { loading } = useWorkout();

    if (loading) {
        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
                <div className="animate-pulse">
                    <div className="h-10 bg-brand-surface-alt rounded w-full mb-4"></div>
                    <div className="h-40 bg-brand-surface-alt rounded w-full"></div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} />
                <h2 className="text-2xl font-bold">Your Progress</h2>
                <div></div> {/* Spacer for centering */}
            </div>
            
            <div className="flex border-b border-brand-border mb-4">
                <button 
                    onClick={() => setActiveView('STRENGTH')}
                    className={`flex-1 py-2 text-center font-semibold ${activeView === 'STRENGTH' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary-text'}`}
                >
                    Strength
                </button>
                <button 
                    onClick={() => setActiveView('BODY')}
                    className={`flex-1 py-2 text-center font-semibold ${activeView === 'BODY' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary-text'}`}
                >
                    Body
                </button>
                <button 
                    onClick={() => setActiveView('HISTORY')}
                    className={`flex-1 py-2 text-center font-semibold ${activeView === 'HISTORY' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary-text'}`}
                >
                    History
                </button>
            </div>
            
            {activeView === 'BODY' && <BodyStats />}
            {activeView === 'STRENGTH' && <StrengthStats />}
            {activeView === 'HISTORY' && <WorkoutHistory />}
        </div>
    );
};

export default Stats;
