import React, { ChangeEvent } from 'react';

type InputType = 'text' | 'password' | 'tel' | 'email';

interface FormInputProps {
  id: string;
  label: string;
  type: InputType;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

const resolveInputMode = (type: InputType): React.InputHTMLAttributes<HTMLInputElement>['inputMode'] => {
  if (type === 'password' || type === 'tel') {
    return 'numeric';
  }
  if (type === 'email') {
    return 'email';
  }
  return 'text';
};

const resolvePattern = (type: InputType): string | undefined => {
  if (type === 'password' || type === 'tel') {
    return '\\d*';
  }
  return undefined;
};

export const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  maxLength,
  className = ''
}) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={id} className="block text-brand-secondary-text text-sm font-bold mb-2">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={`Enter ${label.toLowerCase()}`}
      className="w-full p-3 rounded bg-brand-surface-alt border border-brand-border text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      maxLength={maxLength}
      inputMode={resolveInputMode(type)}
      pattern={resolvePattern(type)}
      required
    />
  </div>
);
