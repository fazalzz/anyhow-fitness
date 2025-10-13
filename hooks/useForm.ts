import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';

type ValidationRule<T = string> = {
  validate: (value: T) => boolean;
  message: string;
};

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

interface UseFormProps<T extends Record<string, any>> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationRules = {},
  onSubmit
}: UseFormProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  // Update a single field
  const handleChange = useCallback((name: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  // Validate all fields or a specific field
  const validate = useCallback((fieldName?: keyof T): boolean => {
    const newErrors: ValidationErrors<T> = {};
    let isValid = true;

    const fieldsToValidate = fieldName 
      ? { [fieldName]: validationRules[fieldName] } 
      : validationRules;

    Object.entries(fieldsToValidate).forEach(([key, rules]) => {
      if (rules) {
        const value = values[key as keyof T];
        for (const rule of rules) {
          if (!rule.validate(value)) {
            newErrors[key as keyof T] = rule.message;
            isValid = false;
            break;
          }
        }
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  }, [values, validationRules]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
    validate
  };
}

// Example validation rules
export const validationRules = {
  required: <T>(message = 'This field is required'): ValidationRule<T> => ({
    validate: (value: T) => value !== undefined && value !== null && value !== '',
    message
  }),
  minLength: (length: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => String(value).length >= length,
    message: message || `Must be at least ${length} characters`
  }),
  maxLength: (length: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => String(value).length <= length,
    message: message || `Must be no more than ${length} characters`
  }),
  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value: string) => regex.test(String(value)),
    message
  }),
  match: <T>(otherValue: T, message: string): ValidationRule<T> => ({
    validate: (value: T) => value === otherValue,
    message
  }),
  email: (message = 'Invalid email address'): ValidationRule<string> => ({
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
    message
  }),
  numeric: (message = 'Must be a number'): ValidationRule<string> => ({
    validate: (value: string) => /^\d+$/.test(String(value)),
    message
  })
};