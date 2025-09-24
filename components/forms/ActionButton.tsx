import React, { ReactNode } from 'react';

interface ActionButtonProps {
    onClick?: (e: React.FormEvent) => void;
    type?: 'submit' | 'button';
    loading: boolean;
    children: ReactNode;
    className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
    onClick,
    type = 'submit',
    loading,
    children,
    className = ''
}) => (
    <button 
        type={type}
        onClick={onClick}
        disabled={loading}
        className={`w-full bg-brand-primary hover:bg-brand-secondary text-brand-primary-text font-bold py-3 px-4 rounded transition-colors disabled:bg-brand-surface-alt disabled:text-brand-secondary-text disabled:cursor-wait ${className}`}
    >
        {loading ? 'Processing...' : children}
    </button>
);