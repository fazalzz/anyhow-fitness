import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BackButton } from './common';

const AccountSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, updateUser, changePin, loading } = useAuth();
    const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
    const [newPhoneNumber, setNewPhoneNumber] = useState(currentUser?.phoneNumber || '');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!currentUser) {
        return (
            <div className="text-brand-secondary-text p-4">
                Unable to load account settings.
            </div>
        );
    }

    const showSuccessMessage = (message: string) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleDisplayNameChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newDisplayName.trim() === '') {
            return setError('Display name cannot be empty.');
        }
        await updateUser(currentUser.id, { displayName: newDisplayName });
        showSuccessMessage('Display name updated successfully!');
    };
    
    const handlePhoneChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{8}$/.test(newPhoneNumber)) {
            return setError('Phone number must be 8 digits.');
        }
        await updateUser(currentUser.id, { phoneNumber: newPhoneNumber });
        showSuccessMessage('Phone number updated successfully!');
    };

    const handlePinChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!currentPin || !newPin || !confirmNewPin) {
            return setError('Please fill in all PIN fields.');
        }
        if (newPin.length !== 8) {
            return setError('New PIN must be 8 digits.');
        }
        if (newPin !== confirmNewPin) {
            return setError('New PINs do not match.');
        }
        const result = await changePin(currentUser.id, currentPin, newPin);
        if (result.success) {
            showSuccessMessage('PIN changed successfully!');
            setCurrentPin('');
            setNewPin('');
            setConfirmNewPin('');
        } else {
            setError(result.error || 'Failed to change PIN.');
        }
    };

    return (
         <div className="bg-brand-surface p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Account</h3>
            {error && <p className="bg-brand-surface-alt border border-brand-border text-brand-primary text-xs p-3 rounded mb-4">{error}</p>}
            {success && <p className="bg-brand-surface-alt border border-brand-border text-brand-primary text-xs p-3 rounded mb-4">{success}</p>}
            
                        <form onSubmit={handleDisplayNameChange} className="mb-4">
                <div className="flex space-x-2">
                    <input type="text" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="flex-grow p-2 rounded bg-brand-surface-alt border border-brand-border" disabled={loading} />
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-primary text-brand-primary-text font-semibold rounded hover:bg-brand-secondary disabled:bg-brand-surface-alt">Update</button>
                </div>
            </form>
            
            <form onSubmit={handlePhoneChange} className="mb-6">
                <label className="block text-sm font-bold mb-2 text-brand-secondary-text">Phone Number</label>
                <div className="flex gap-2">
                    <input type="tel" value={newPhoneNumber} onChange={e => setNewPhoneNumber(e.target.value)} maxLength={8} className="flex-grow p-2 rounded bg-brand-surface-alt border border-brand-border" disabled={loading} />
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-brand-primary-text font-bold rounded disabled:bg-brand-surface-alt" disabled={loading}>{loading ? '...' : 'Save'}</button>
                </div>
            </form>

            <hr className="border-brand-border mb-6" />

             <form onSubmit={handlePinChange}>
                <h4 className="text-md font-semibold mb-2 text-brand-primary">Change PIN</h4>
                <div className="space-y-2">
                    <input type="password" placeholder="Current PIN" value={currentPin} onChange={e => setCurrentPin(e.target.value)} maxLength={8} className="w-full p-2 rounded bg-brand-surface-alt border border-brand-border" disabled={loading} />
                    <input type="password" placeholder="New PIN" value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={8} className="w-full p-2 rounded bg-brand-surface-alt border border-brand-border" disabled={loading} />
                    <input type="password" placeholder="Confirm New PIN" value={confirmNewPin} onChange={e => setConfirmNewPin(e.target.value)} maxLength={8} className="w-full p-2 rounded bg-brand-surface-alt border border-brand-border" disabled={loading} />
                </div>
                 <button type="submit" className="w-full mt-3 py-2 bg-brand-secondary hover:bg-brand-primary text-brand-primary-text font-bold rounded transition-colors disabled:bg-brand-surface-alt" disabled={loading}>{loading ? 'Changing...' : 'Change PIN'}</button>
            </form>
        </div>
    );
}

const Profile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, updateUser, loading } = useAuth();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-brand-secondary-text">Loading profile...</div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-brand-secondary-text">Unable to load profile. Please try logging in again.</div>
            </div>
        );
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateUser(currentUser.id, { avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePrivacyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateUser(currentUser.id, { isPrivate: e.target.checked });
    };

    const maskedPhone = currentUser.phoneNumber 
        ? currentUser.phoneNumber.slice(-4).padStart(currentUser.phoneNumber.length, '*')
        : 'Not provided';

    return (
        <div>
            <div className="flex items-start justify-start mb-6">
                <BackButton onClick={onBack} />
            </div>
            
            <div className="bg-brand-surface p-4 rounded-lg mb-6">
                 <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/*"
                />
                <div className="flex items-center">
                    <button onClick={() => avatarInputRef.current?.click()} className="relative group">
                        <img 
                            src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=667eea&color=fff&size=64`} 
                            alt={currentUser.displayName} 
                            className="w-16 h-16 rounded-full mr-4 border-2 border-brand-primary" 
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">Edit</span>
                        </div>
                    </button>
                    <div>
                        <h3 className="text-xl font-semibold">{currentUser.displayName}</h3>
                        <p className="text-brand-secondary-text">Phone: {maskedPhone}</p>
                    </div>
                </div>
            </div>

            <AccountSettings onBack={onBack} />

            <div className="bg-brand-surface p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-2">Privacy</h3>
                <div className="flex items-center justify-between">
                    <label htmlFor="private-profile" className="text-brand-primary">Private Profile</label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input
                            type="checkbox"
                            name="private-profile"
                            id="private-profile"
                            checked={currentUser.isPrivate}
                            onChange={handlePrivacyChange}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                         <label htmlFor="private-profile" className="toggle-label block overflow-hidden h-6 rounded-full bg-brand-surface-alt cursor-pointer"></label>
                    </div>
                </div>
                 <p className="text-xs text-brand-secondary-text mt-2">When enabled, your posts will only be visible to you.</p>
            </div>

            <div className="bg-brand-surface p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Gym Management</h3>
                <p className="text-sm text-brand-secondary-text mb-3">
                    Add and manage your gym locations in the workout session.
                </p>
                <p className="text-xs text-brand-secondary-text">
                    Custom gyms can be added when starting a new workout by clicking the "+ Add Gym" button.
                </p>
            </div>

            <style>{`
                .toggle-checkbox:checked { right: 0; border-color: #FFFFFF; }
                .toggle-checkbox:checked + .toggle-label { background-color: #718096; }
            `}</style>
        </div>
    );
};

export default Profile;
