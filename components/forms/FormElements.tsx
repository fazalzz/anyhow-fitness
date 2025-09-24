import React, { ReactNode } from 'react';

interface FormErrorProps {
    message?: string;
    className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, className = '' }) => {
    if (!message) return null;
    
    return (
        <p className={`bg-brand-surface border border-brand-border text-brand-primary text-xs p-3 rounded mb-4 ${className}`}>
            {message}
        </p>
    );
};

interface FormInfoProps {
    message?: string;
    className?: string;
}

export const FormInfo: React.FC<FormInfoProps> = ({ message, className = '' }) => {
    if (!message) return null;
    
    return (
        <p className={`bg-brand-surface border border-brand-border text-brand-secondary-text text-xs p-3 rounded mb-4 ${className}`}>
            {message}
        </p>
    );
};

interface FormWrapperProps {
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    children: ReactNode;
    className?: string;
}

export const FormWrapper: React.FC<FormWrapperProps> = ({
    onSubmit,
    children,
    className = ''
}) => (
    <form onSubmit={onSubmit} className={className}>
        {children}
    </form>
);