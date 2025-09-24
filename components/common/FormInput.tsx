import React from 'react';

interface FormInputProps {
  id: string;
  label: string;
  type?: 'text' | 'password' | 'tel' | 'email' | 'number';
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  maxLength,
  required = true,
  placeholder,
  error,
  autoComplete
}) => {
  const isNumeric = type === 'password' || type === 'tel' || type === 'number';
  
  return (
    <div className="mb-4">
      <label 
        htmlFor={id} 
        className="block text-brand-secondary-text text-sm font-bold mb-2"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className={`w-full p-3 rounded bg-brand-surface-alt border 
          ${error ? 'border-red-500' : 'border-brand-border'} 
          text-brand-primary focus:outline-none focus:ring-2 
          focus:ring-brand-primary ${error ? 'ring-red-500' : ''}`}
        maxLength={maxLength}
        inputMode={isNumeric ? 'numeric' : 'text'}
        pattern={isNumeric ? '\\d*' : undefined}
        required={required}
        autoComplete={autoComplete}
      />
      {error && (
        <p className="mt-1 text-red-500 text-xs">{error}</p>
      )}
    </div>
  );
};