import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { Post } from '../types';

interface PostWorkoutModalProps {
    onClose: () => void;
    workoutId: string;
}

const PostWorkoutModal: React.FC<PostWorkoutModalProps> = ({ onClose, workoutId }) => {
    const [caption, setCaption] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { currentUser } = useAuth();
    const { addPost } = useWorkout();

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            // Fix: Corrected typo from readAsdataURL to readAsDataURL.
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async () => {
        if (!currentUser || !image) return;

        setIsSubmitting(true);
        const newPost: Post = {
            id: Date.now().toString(),
            userId: currentUser.id,
            userName: currentUser.displayName,
            userAvatar: currentUser.avatar || '',
            date: new Date().toISOString(),
            imageUrl: image,
            caption,
            workoutId,
        };
        await addPost(newPost);
        setIsSubmitting(false);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-surface rounded-lg p-6 w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4">Share Your Workout!</h2>
                
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-brand-border rounded-lg flex items-center justify-center mb-4 text-brand-secondary-text hover:border-brand-primary"
                >
                    {image ? (
                        <img src={image} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        "Tap to add a picture"
                    )}
                </button>

                <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full p-2 rounded bg-brand-surface-alt border border-brand-border mb-4 h-20 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-brand-surface-alt hover:bg-brand-border font-semibold">Skip</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!image || isSubmitting} 
                        className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-secondary text-brand-primary-text font-semibold disabled:bg-brand-surface-alt disabled:text-brand-primary-text disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostWorkoutModal;