import React from 'react';
import { useWorkout } from '../context/WorkoutContext';
import { useAuth } from '../context/AuthContext';
import { WeightIcon } from './icons';
import { Post, Workout, LoggedExercise } from '../types';
import { EXERCISES } from '../constants';


interface SocialFeedProps {
    onStartWorkout: () => void;
}

const WorkoutSummary: React.FC<{workout: Workout}> = ({ workout }) => {
    const findExerciseName = (id: string) => EXERCISES.find(e => e.id === id)?.name || 'Unknown Exercise';
    
    const getBestSet = (ex: LoggedExercise) => {
        if (!ex.sets || ex.sets.length === 0) return null;
        return ex.sets.reduce((best, current) => current.weight > best.weight ? current : best);
    }
    
    return (
        <div className="bg-brand-surface p-3 my-3 rounded-md">
            <p className="font-semibold text-sm text-brand-secondary-text mb-2">Workout at {workout.branch}</p>
            <ul className="space-y-2">
            {workout.exercises.map(ex => {
                const bestSet = getBestSet(ex);
                return (
                    <li key={ex.id} className="text-xs flex items-center justify-between p-2 bg-brand-bg rounded">
                        <div>
                            <p className="font-bold">{findExerciseName(ex.exerciseId)}</p>
                            <p className="text-brand-secondary-text">{ex.variation} - {ex.brand}</p>
                        </div>
                        {bestSet && <p className="font-mono text-brand-primary">{bestSet.weight}kg x {bestSet.reps}</p>}
                    </li>
                );
            })}
            </ul>
        </div>
    );
};

const PostCard: React.FC<{post: Post, workouts: Workout[]}> = ({ post, workouts }) => {
    const workoutForPost = workouts.find(w => w.id === post.workoutId);
    return (
         <div className="bg-brand-surface rounded-lg overflow-hidden shadow-md">
            <div className="p-4 flex items-center">
                <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full mr-3" />
                <div>
                    <p className="font-semibold">{post.userName}</p>
                    <p className="text-xs text-brand-secondary-text">{new Date(post.date).toLocaleString()}</p>
                </div>
            </div>
            {post.caption && <p className="px-4 pb-2 text-brand-primary">{post.caption}</p>}
            {workoutForPost && <WorkoutSummary workout={workoutForPost} />}
            <img src={post.imageUrl} alt="Workout post" className="w-full h-auto" />
        </div>
    )
}

const FeedSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <div className="bg-brand-surface rounded-lg">
            <div className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-full mr-3 bg-brand-surface-alt"></div>
                <div>
                    <div className="h-4 w-24 bg-brand-surface-alt rounded"></div>
                    <div className="h-3 w-32 bg-brand-surface-alt rounded mt-1"></div>
                </div>
            </div>
            <div className="h-64 bg-brand-surface-alt"></div>
        </div>
         <div className="bg-brand-surface rounded-lg">
            <div className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-full mr-3 bg-brand-surface-alt"></div>
                <div>
                    <div className="h-4 w-24 bg-brand-surface-alt rounded"></div>
                    <div className="h-3 w-32 bg-brand-surface-alt rounded mt-1"></div>
                </div>
            </div>
            <div className="h-64 bg-brand-surface-alt"></div>
        </div>
    </div>
);


export const SocialFeed: React.FC<SocialFeedProps> = ({ onStartWorkout }) => {
  const { posts, workouts, loading } = useWorkout();
  const { currentUser, users } = useAuth();
  
  const visiblePosts = posts.filter(post => {
      if (post.userId === currentUser?.id) return true;
      const author = users.find(u => u.id === post.userId);
      return author && !author.isPrivate;
  });

  return (
    <div>
        <button 
            onClick={onStartWorkout} 
            className="w-full flex items-center justify-center p-4 mb-6 bg-brand-primary hover:bg-brand-secondary text-brand-primary-text font-bold rounded-lg text-lg transition-colors shadow-lg"
        >
            <WeightIcon />
            <span className="ml-2">Start New Workout</span>
        </button>
        <h2 className="text-2xl font-bold mb-4">Friends Feed</h2>
        {loading ? (
           <FeedSkeleton />
        ) : visiblePosts.length === 0 ? (
            <p className="text-brand-secondary-text text-center py-8">No posts yet. Finish a workout to share your progress!</p>
        ) : (
            <div className="space-y-6">
                {visiblePosts.map(post => (
                    <PostCard key={post.id} post={post} workouts={workouts} />
                ))}
            </div>
        )}
    </div>
  );
};
