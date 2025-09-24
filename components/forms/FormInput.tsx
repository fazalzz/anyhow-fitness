import React, { ChangeEvent } from 'react';

interface FormInputProps {
  id: string;
  label: string;
  type: 'text' | 'password' | 'tel';
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

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
      inputMode={type === "password" || type === "tel" ? "numeric" : "text"}
      pattern={type === "password" || type === "tel" ? "\\d*" : undefined}
      required
    />
  </div>
);