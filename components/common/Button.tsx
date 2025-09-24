import React from 'react';

interface ButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  type?: 'submit' | 'button' | 'reset';
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  type = 'button',
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  children,
  className = '',
  icon
}) => {
  const baseStyles = 'font-bold rounded transition-colors focus:outline-none focus:ring-2 flex items-center justify-center';
  
  const variantStyles = {
    primary: 'bg-brand-primary hover:bg-brand-secondary text-brand-primary-text disabled:bg-brand-surface-alt disabled:text-brand-secondary-text',
    secondary: 'bg-brand-surface-alt hover:bg-brand-border text-brand-primary disabled:bg-brand-surface disabled:text-brand-secondary-text',
    outline: 'border border-brand-border hover:bg-brand-surface-alt text-brand-primary disabled:text-brand-secondary-text'
  };

  const sizeStyles = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading ? (
        <span className="animate-spin mr-2">⟳</span>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};