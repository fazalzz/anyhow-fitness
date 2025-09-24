
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProgressChartProps {
    exerciseId: string;
    variation: 'Bilateral' | 'Unilateral';
    brand: string;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ exerciseId, variation, brand }) => {
    const { currentUser } = useAuth();
    const { getWorkoutsByUserId } = useWorkout();

    if (!currentUser) return null;

    const userWorkouts = getWorkoutsByUserId(currentUser.id);

    const data = userWorkouts.map(workout => {
        let maxWeight = 0;
        workout.exercises.forEach(ex => {
            if (ex.exerciseId === exerciseId && ex.variation === variation && ex.brand === brand) {
                ex.sets.forEach(set => {
                    if (set.weight > maxWeight) {
                        maxWeight = set.weight;
                    }
                });
            }
        });

        return {
            date: new Date(workout.date).toLocaleDateString('en-CA'), // YYYY-MM-DD
            weight: maxWeight > 0 ? maxWeight : null,
        };
    }).filter(d => d.weight !== null).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    if (data.length === 0) {
        return <p className="text-brand-secondary-text text-center py-4">No data yet for this variation.</p>;
    }

    return (
        <div className="bg-brand-surface p-2 rounded-lg h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="date" stroke="#A0AEC0" fontSize={12} />
                    <YAxis stroke="#A0AEC0" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} 
                      labelStyle={{ color: '#FFFFFF' }}
                    />
                    <Legend wrapperStyle={{fontSize: "14px"}}/>
                    <Line type="monotone" dataKey="weight" stroke="#ffffff" strokeWidth={2} activeDot={{ r: 8 }} name="Max Weight (kg)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProgressChart;