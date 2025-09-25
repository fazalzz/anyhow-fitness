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
    const { workouts } = useWorkout();
    const { currentUser } = useAuth();

    const handleSave = () => {
        onSave(editedWorkout);
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

    // Get previous workout history for this exercise
    const getPreviousPerformance = (exerciseId: string, variation: string, brand: string) => {
        if (!currentUser) return [];
        
        const previousWorkouts = workouts
            .filter(w => w.userId === currentUser.id && w.id !== workout.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3); // Get last 3 workouts

        const previousSets = [];
        for (const prevWorkout of previousWorkouts) {
            const exercise = prevWorkout.exercises.find(ex => 
                ex.exerciseId === exerciseId && 
                ex.variation === variation && 
                ex.brand === brand
            );
            if (exercise && exercise.sets.length > 0) {
                previousSets.push({
                    date: prevWorkout.date,
                    sets: exercise.sets
                });
            }
        }
        return previousSets;
    };

    const copyFromPrevious = (exerciseIndex: number, previousSet: any) => {
        const newSet = {
            id: `new-${Date.now()}-${Math.random()}`,
            weight: previousSet.weight,
            reps: previousSet.reps,
            pinWeight: previousSet.pinWeight,
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-bg rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-brand-surface-alt p-6 border-b border-brand-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-brand-primary">Edit Workout</h2>
                        <button
                            onClick={onCancel}
                            className="p-2 text-brand-secondary-text hover:text-brand-primary rounded-lg transition-colors"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-brand-secondary-text">Workout Date</label>
                            <input
                                type="date"
                                value={editedWorkout.date}
                                onChange={(e) => setEditedWorkout(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full p-3 border border-brand-border rounded-lg bg-brand-surface focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-brand-secondary-text">Gym Location</label>
                            <input
                                type="text"
                                value={editedWorkout.branch}
                                onChange={(e) => setEditedWorkout(prev => ({ ...prev, branch: e.target.value }))}
                                className="w-full p-3 border border-brand-border rounded-lg bg-brand-surface focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                placeholder="Enter gym name"
                            />
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-brand-surface rounded-lg">
                        <p className="text-sm text-brand-secondary-text">
                            <span className="font-semibold">💡 Tip:</span> Click on previous performance values to quickly copy them to a new set.
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {editedWorkout.exercises.map((exercise, exerciseIndex) => {
                        const previousPerformance = getPreviousPerformance(exercise.exerciseId, exercise.variation, exercise.brand);
                        
                        return (
                            <div key={exercise.id} className="border border-brand-border rounded-lg overflow-hidden">
                                <div className="bg-brand-surface-alt p-4">
                                    <h3 className="font-semibold text-lg mb-2">
                                        {findExerciseName(exercise.exerciseId)} - {exercise.variation}
                                    </h3>
                                    <p className="text-sm text-brand-secondary-text">Equipment: {exercise.brand}</p>
                                </div>

                                <div className="p-4">
                                    {/* Previous Performance Section */}
                                    {previousPerformance.length > 0 && (
                                        <div className="mb-4 p-3 bg-brand-surface rounded-lg">
                                            <h4 className="text-sm font-semibold mb-2 text-brand-secondary-text">Previous Performance</h4>
                                            <div className="space-y-2">
                                                {previousPerformance.map((prev, prevIndex) => (
                                                    <div key={prevIndex} className="text-xs">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-medium">{new Date(prev.date).toLocaleDateString('en-GB')}</span>
                                                            <span className="text-brand-secondary-text">{prev.sets.length} sets</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {prev.sets.map((set, setIdx) => (
                                                                <button
                                                                    key={setIdx}
                                                                    onClick={() => copyFromPrevious(exerciseIndex, set)}
                                                                    className="px-2 py-1 bg-brand-border text-brand-primary rounded text-xs hover:bg-brand-primary hover:text-brand-primary-text transition-colors"
                                                                    title="Click to copy this set"
                                                                >
                                                                    {set.weight}{set.pinWeight ? `+${set.pinWeight}` : ''}kg × {set.reps}
                                                                    {set.isPR && <span className="text-yellow-500 ml-1">★</span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Sets Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-brand-primary">Current Sets</h4>
                                        {exercise.sets.map((set, setIndex) => (
                                            <div key={set.id} className="bg-brand-surface rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">Set {setIndex + 1}</span>
                                                    {exercise.sets.length > 1 && (
                                                        <button
                                                            onClick={() => removeSet(exerciseIndex, setIndex)}
                                                            className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                                            title="Remove set"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    <div>
                                                        <label className="block text-xs text-brand-secondary-text mb-1">Weight (kg)</label>
                                                        <input
                                                            type="number"
                                                            value={set.weight}
                                                            onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                                                            className="w-full p-2 border border-brand-border rounded text-center focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                                        />
                                                    </div>
                                                    {set.pinWeight !== undefined && (
                                                        <div>
                                                            <label className="block text-xs text-brand-secondary-text mb-1">Pin Weight (kg)</label>
                                                            <input
                                                                type="number"
                                                                value={set.pinWeight || ''}
                                                                onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'pinWeight', parseFloat(e.target.value) || undefined)}
                                                                className="w-full p-2 border border-brand-border rounded text-center focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-xs text-brand-secondary-text mb-1">Reps</label>
                                                        <input
                                                            type="number"
                                                            value={set.reps}
                                                            onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                                                            className="w-full p-2 border border-brand-border rounded text-center focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <label className="flex items-center gap-2 p-2 bg-brand-surface-alt rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={set.isPR}
                                                                onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'isPR', e.target.checked)}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm font-medium">PR</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addSet(exerciseIndex)}
                                            className="w-full p-3 border-2 border-dashed border-brand-border rounded-lg text-brand-secondary-text hover:bg-brand-surface hover:border-brand-primary transition-colors"
                                        >
                                            + Add Set
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-brand-surface-alt p-6 border-t border-brand-border">
                    <div className="flex gap-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 p-3 border border-brand-border rounded-lg hover:bg-brand-surface transition-colors font-semibold"
                        >
                            Cancel Changes
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 p-3 bg-brand-primary text-brand-primary-text rounded-lg hover:bg-brand-secondary transition-colors font-semibold shadow-lg"
                        >
                            Save Workout
                        </button>
                    </div>
                    <p className="text-xs text-brand-secondary-text mt-3 text-center">
                        Changes will be saved immediately and sync across your workout history.
                    </p>
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

    // Sort data from oldest to newest for left-to-right chart
    const chartData = data
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(entry => ({
            date: new Date(entry.date).toLocaleDateString('en-CA'),
            weight: entry.weight,
        }));

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

type TimeFrame = '1week' | '1month' | '3months' | '6months' | '1year' | 'all';

const BodyWeightHistoryTable: React.FC<{ 
    data: BodyWeightEntry[], 
    onEdit: (entry: BodyWeightEntry) => void,
    onDelete: (id: string) => void 
}> = ({ data, onEdit, onDelete }) => {
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
                        <th scope="col" className="px-4 py-2">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {reversedData.map((entry) => (
                        <tr key={entry.id} className="bg-brand-surface-alt border-b border-brand-border last:border-b-0">
                            <td className="px-4 py-2 font-mono text-brand-primary">{new Date(entry.date).toLocaleDateString('en-CA')}</td>
                            <td className="px-4 py-2 font-mono text-brand-primary">{entry.weight.toFixed(1)}</td>
                            <td className="px-4 py-2">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onEdit(entry)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(entry.id)}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const BodyStats: React.FC = () => {
    const { currentUser } = useAuth();
    const { addBodyWeightEntry, updateBodyWeightEntry, deleteBodyWeightEntry, getBodyWeightEntriesByUserId } = useWorkout();
    const [weight, setWeight] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('3months');
    const [editingEntry, setEditingEntry] = useState<BodyWeightEntry | null>(null);

    if (!currentUser) return null;

    const allUserWeightData = getBodyWeightEntriesByUserId(currentUser.id);

    // Filter data based on selected time frame
    const getFilteredData = (data: BodyWeightEntry[], timeFrame: TimeFrame): BodyWeightEntry[] => {
        if (timeFrame === 'all') return data;
        
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (timeFrame) {
            case '1week':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '1month':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case '3months':
                cutoffDate.setMonth(now.getMonth() - 3);
                break;
            case '6months':
                cutoffDate.setMonth(now.getMonth() - 6);
                break;
            case '1year':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        return data.filter(entry => new Date(entry.date) >= cutoffDate);
    };

    const filteredData = getFilteredData(allUserWeightData, timeFrame);

    const handleAddWeight = async (e: React.FormEvent) => {
        e.preventDefault();
        const weightNum = parseFloat(weight);
        if (weightNum > 0 && currentUser && date) {
            setIsSubmitting(true);
            const selectedDate = new Date(date);
            selectedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
            
            if (editingEntry) {
                // Update existing entry
                await updateBodyWeightEntry(editingEntry.id, {
                    weight: weightNum,
                    date: selectedDate.toISOString()
                });
            } else {
                // Create new entry
                const newEntry: BodyWeightEntry = {
                    id: Date.now().toString(),
                    userId: currentUser.id,
                    date: selectedDate.toISOString(),
                    weight: weightNum,
                };
                await addBodyWeightEntry(newEntry);
            }
            
            setWeight('');
            setDate(new Date().toISOString().split('T')[0]);
            setEditingEntry(null);
            setIsSubmitting(false);
        }
    };

    const handleEdit = (entry: BodyWeightEntry) => {
        setEditingEntry(entry);
        setWeight(entry.weight.toString());
        setDate(new Date(entry.date).toISOString().split('T')[0]);
    };

    const handleCancelEdit = () => {
        setEditingEntry(null);
        setWeight('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            await deleteBodyWeightEntry(id);
        }
    };

    const timeFrameOptions: { value: TimeFrame; label: string }[] = [
        { value: '1week', label: '1W' },
        { value: '1month', label: '1M' },
        { value: '3months', label: '3M' },
        { value: '6months', label: '6M' },
        { value: '1year', label: '1Y' },
        { value: 'all', label: 'All' },
    ];

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Body Weight Tracker</h3>
            
            {/* Input Form */}
            <form onSubmit={handleAddWeight} className="space-y-3 mb-4">
                <div className="flex gap-2">
                    <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="flex-1 p-2 rounded bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-primary"
                        disabled={isSubmitting}
                    />
                    <input 
                        type="number"
                        step="0.1"
                        placeholder="Weight (kg)"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="flex-1 p-2 rounded bg-brand-surface-alt border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-primary"
                        disabled={isSubmitting}
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded disabled:bg-brand-surface-alt disabled:text-brand-secondary-text"
                        disabled={isSubmitting || !weight || !date}
                    >
                        {isSubmitting ? '...' : editingEntry ? 'Update Entry' : 'Add Entry'}
                    </button>
                    {editingEntry && (
                        <button 
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-secondary-text rounded hover:bg-brand-surface-alt"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Time Frame Selection */}
            <div className="flex gap-1 mb-4 overflow-x-auto">
                {timeFrameOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setTimeFrame(option.value)}
                        className={`px-3 py-1 text-sm rounded-full border whitespace-nowrap ${
                            timeFrame === option.value
                                ? 'bg-brand-primary text-brand-primary-text border-brand-primary'
                                : 'bg-brand-surface border-brand-border text-brand-secondary-text hover:border-brand-primary'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <BodyWeightChart data={filteredData} />
            <BodyWeightHistoryTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} />
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
            <div className="relative flex items-center justify-center mb-4">
                <div className="absolute left-0">
                    <BackButton onClick={onBack} />
                </div>
                <h2 className="text-2xl font-bold">Your Progress</h2>
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
