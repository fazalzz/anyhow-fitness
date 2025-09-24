import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  showText?: boolean;
}

const sizeClasses = {
  small: 'w-8 h-8',
  medium: 'w-16 h-16',
  large: 'w-24 h-24',
  xlarge: 'w-32 h-32'
};

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  className = '', 
  showText = false 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src="/logo.png"
        alt="Anyhow Fitness Logo" 
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          // Fallback to a simple text logo if image fails to load
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent && !parent.querySelector('.fallback-logo')) {
            const fallback = document.createElement('div');
            fallback.className = `fallback-logo ${sizeClasses[size]} bg-brand-primary text-brand-bg rounded-full flex items-center justify-center font-bold text-lg`;
            fallback.textContent = 'P';
            parent.appendChild(fallback);
          }
        }}
      />
      {showText && (
        <span className="ml-3 text-2xl font-bold text-brand-primary">
          Anyhow Fitness
        </span>
      )}
    </div>
  );
};

export default Logo;