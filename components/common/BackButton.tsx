import React from 'react';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  className = '', 
  children = 'Back' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center text-brand-primary hover:text-brand-secondary transition-colors duration-200 ${className}`}
    >
      <svg 
        className="w-5 h-5 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 19l-7-7 7-7" 
        />
      </svg>
      {children}
    </button>
  );
};

export default BackButton;