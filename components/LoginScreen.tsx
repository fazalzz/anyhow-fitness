import React, { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { FrontendUser as User } from '../types';
import { ActionButton } from './forms/ActionButton';
import { FormInput } from './forms/FormInput';
import Logo from './Logo';

type View = 'LOGIN' | 'REGISTER' | 'FORGOT_PIN_NAME' | 'FORGOT_PIN_CODE' | 'FORGOT_PIN_RESET' | 'TWO_FACTOR';

interface FormFields {
  name: string;
  pin: string;
  confirmPin: string;
  email: string;
  verificationCode: string;
}
// Removed unused FayeLogoOld component

interface LoginScreenProps {}

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { login, verifyTwoFactor, resendTwoFactor, register, findUserByName, requestResetCode, resetPin, loading, error: authError } = useAuth();
  
  // State
  const [view, setView] = useState<View>('LOGIN');
  const [formState, setFormState] = useState<FormFields & {error: string; info: string}>({
    name: '',
    pin: '',
    confirmPin: '',
    email: '',
    verificationCode: '',
    error: '',
    info: ''
  });
  const [userToRecover, setUserToRecover] = useState<User | null>(null);

  const [sentVerificationCode, setSentVerificationCode] = useState<string | null>(null);
  const [resetIdentifier, setResetIdentifier] = useState<string | null>(null);

  const [twoFactorState, setTwoFactorState] = useState<{ token: string; email: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { name, pin, confirmPin, email, verificationCode, error, info } = formState;

  const updateFormField = (field: keyof FormFields, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const resetFormState = () => {
    setFormState({
      name: '',
      pin: '',
      confirmPin: '',
      email: '',
      verificationCode: '',
      error: '',
      info: ''
    });
    setUserToRecover(null);
    setSentVerificationCode(null);
    setResetIdentifier(null);
    setTwoFactorState(null);
    setTwoFactorCode('');
  };
  
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState(prev => ({ ...prev, error: '', info: '' }));
    setTwoFactorCode('');
    setTwoFactorState(null);

    const processLoginResult = (loginResult: any) => {
      if (!loginResult.success) {
        return false;
      }

      if (loginResult?.requiresTwoFactor) {
        const details = loginResult as { twoFactorToken: string; email: string; message?: string };
        setTwoFactorState({ token: details.twoFactorToken, email: details.email });
        setTwoFactorCode('');
        setFormState(prev => ({ ...prev, info: details.message ?? 'We emailed you a verification code.' }));
        setView('TWO_FACTOR');
        return true;
      }

      return true;
    };

    let result = await login(name, pin);

    if (!processLoginResult(result)) {
      const trimmedName = name.trim();
      if (trimmedName.includes('@')) {
        result = await login('', pin, trimmedName);
        if (processLoginResult(result)) {
          return;
        }
      }

      const errorMessage = !result.success ? result.error : 'Login failed.';
      setFormState(prev => ({ ...prev, error: errorMessage }));
    }
  };


  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState(prev => ({ ...prev, error: '', info: '' }));
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) return setFormState(prev => ({ ...prev, error: 'Please enter a name.' }));
    if (!trimmedEmail.includes('@')) return setFormState(prev => ({ ...prev, error: 'Please enter a valid email address.' }));
    if (pin.length !== 8) return setFormState(prev => ({ ...prev, error: 'PIN must be 8 digits.' }));
    if (pin !== confirmPin) return setFormState(prev => ({ ...prev, error: 'PINs do not match.' }));
    
    const result = await register(trimmedName, pin, trimmedEmail);
    if (result?.success) {
      setFormState(prev => ({ ...prev, info: result.message ?? 'Logged in successfully!' }));
    }
  };

  const handleTwoFactorVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!twoFactorState) {
      return;
    }

    if (!twoFactorCode.trim()) {
      setFormState(prev => ({ ...prev, error: 'Please enter the verification code.' }));
      return;
    }

    setFormState(prev => ({ ...prev, error: '' }));
    const result = await verifyTwoFactor(twoFactorState.token, twoFactorCode.trim());
    if (result.success) {
      resetFormState();
      setView('LOGIN');
    } else {
      setFormState(prev => ({ ...prev, error: result.error ?? 'Invalid verification code.' }));
    }
  };

  const handleResendTwoFactor = async () => {
    if (!twoFactorState) {
      return;
    }

    const result = await resendTwoFactor(twoFactorState.token);
    if (result.success && result.twoFactorToken) {
      setTwoFactorState({ token: result.twoFactorToken, email: result.email || twoFactorState.email });
      setTwoFactorCode('');
      setFormState(prev => ({ ...prev, info: 'A new verification code has been sent to your email.', error: '' }));
    } else if (result.error) {
      setFormState(prev => ({ ...prev, error: result.error ?? 'Unable to resend verification code.' }));
    }
  };

  const handleFindUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState(prev => ({ ...prev, error: '', info: '' }));

    if (!name.trim()) {
      setFormState(prev => ({ ...prev, error: 'Please enter a name.' }));
      return;
    }

    try {
      const user = await findUserByName(name.trim());
      if (!user) {
        setFormState(prev => ({ ...prev, error: 'No user found with that name.' }));
        return;
      }

      const identifier = user.email || user.username || user.id;
      if (!identifier) {
        setFormState(prev => ({ ...prev, error: 'Unable to identify this user. Please contact support.' }));
        return;
      }

      const resetResult = await requestResetCode(identifier);
      if (!resetResult.success) {
        setFormState(prev => ({ ...prev, error: resetResult.error ?? 'Unable to send verification code. Please try again.' }));
        return;
      }

      setUserToRecover(user);
      setResetIdentifier(identifier);
      setSentVerificationCode(resetResult.verificationCode ?? null);

      const maskedEmail = user.email ?? null;
      const codeMessage = resetResult.verificationCode
        ? ` For testing, your code is ${resetResult.verificationCode}.`
        : '';

      setFormState(prev => ({
        ...prev,
        info: maskedEmail
          ? `Verification code sent to ${maskedEmail}.${codeMessage}`
          : `Verification code sent.${codeMessage}`,
        verificationCode: ''
      }));
      setView('FORGOT_PIN_CODE');
    } catch (findError) {
      console.error('Error finding user:', findError);
      setFormState(prev => ({ ...prev, error: 'Unable to find user. Please try again.' }));
    }
  };

  const handleVerifyCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState(prev => ({ ...prev, error: '' }));

    if (!verificationCode.trim()) {
      setFormState(prev => ({ ...prev, error: 'Please enter the verification code.' }));
      return;
    }

    if (sentVerificationCode && verificationCode.trim() !== sentVerificationCode) {
      setFormState(prev => ({ ...prev, error: 'Invalid verification code.' }));
      return;
    }

    setFormState(prev => ({ ...prev, info: '' }));
    setView('FORGOT_PIN_RESET');
  };

  const handleResetPin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState(prev => ({ ...prev, error: '' }));

    if (!resetIdentifier || !userToRecover) {
      setFormState(prev => ({ ...prev, error: 'Please restart the reset process.' }));
      return;
    }

    if (pin.length !== 8) {
      setFormState(prev => ({ ...prev, error: 'New PIN must be 8 digits.' }));
      return;
    }

    if (pin !== confirmPin) {
      setFormState(prev => ({ ...prev, error: 'PINs do not match.' }));
      return;
    }

    const result = await resetPin(resetIdentifier, verificationCode.trim(), pin);
    if (result.success) {
      resetFormState();
      setFormState(prev => ({ ...prev, info: 'PIN updated successfully. Please log in with your new PIN.' }));
      setView('LOGIN');
    } else {
      setFormState(prev => ({ ...prev, error: result.error ?? 'Failed to reset PIN.' }));
    }
  };

  const changeView = (newView: View) => {
    resetFormState();
    setView(newView);
  };

  const renderTitle = () => {
    switch (view) {
      case 'LOGIN':
        return 'Welcome Back';
      case 'REGISTER':
        return 'Create Account';
      case 'FORGOT_PIN_NAME':
        return 'Forgot PIN';
      case 'FORGOT_PIN_CODE':
        return 'Verify Code';
      case 'FORGOT_PIN_RESET':
        return 'Reset PIN';
      case 'TWO_FACTOR':
        return 'Two-Factor Verification';
      default:
        return 'Welcome Back';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-brand-bg">
      <Logo size="xlarge" className="mb-4" />
      <h1 className="text-4xl font-bold text-brand-primary mb-2">Anyhow Fitness</h1>
      <h2 className="text-2xl font-semibold text-brand-primary mb-8">{renderTitle()}</h2>
      
      <div className="w-full max-w-sm">
        {(error || authError) && <p className="bg-brand-surface border border-brand-border text-brand-primary text-xs p-3 rounded mb-4">{error || authError}</p>}
        {info && <p className="bg-brand-surface border border-brand-border text-brand-secondary-text text-xs p-3 rounded mb-4">{info}</p>}

        {view === 'LOGIN' && (
            <form onSubmit={handleLogin}>
                <FormInput id="name" label="Name" type="text" value={name} onChange={(value) => updateFormField('name', value)} />
                <FormInput id="pin" label="PIN" type="password" value={pin} maxLength={8} onChange={(value) => updateFormField('pin', value)} />
                <ActionButton loading={loading}>Login</ActionButton>
            </form>
        )}

        {view === 'REGISTER' && (
            <form onSubmit={handleRegister}>
                <FormInput id="name" label="Name" type="text" value={name} onChange={(value) => updateFormField('name', value)} />
                <FormInput id="email" label="Email" type="email" value={email} onChange={(value) => updateFormField('email', value)} />
                <FormInput id="pin" label="PIN (8 digits)" type="password" value={pin} maxLength={8} onChange={(value) => updateFormField('pin', value)} />
                <FormInput id="confirmPin" label="Confirm PIN" type="password" value={confirmPin} maxLength={8} onChange={(value) => updateFormField('confirmPin', value)} />
                <ActionButton loading={loading}>Register</ActionButton>
            </form>
        )}

        {view === 'FORGOT_PIN_NAME' && (
            <form onSubmit={handleFindUser}>
                <FormInput id="name" label="Name" type="text" value={name} onChange={(value) => updateFormField('name', value)} />
                <ActionButton loading={loading}>Find Account</ActionButton>
            </form>
        )}
        
        {view === 'FORGOT_PIN_CODE' && (
            <form onSubmit={handleVerifyCode}>
                <FormInput id="verificationCode" label="Verification Code" type="tel" value={verificationCode} maxLength={6} onChange={(value) => updateFormField('verificationCode', value)} />
                <ActionButton loading={loading}>Verify</ActionButton>
            </form>
        )}

        {view === 'FORGOT_PIN_RESET' && (
             <form onSubmit={handleResetPin}>
                <FormInput id="pin" label="New PIN (8 digits)" type="password" value={pin} maxLength={8} onChange={(value) => updateFormField('pin', value)} />
                <FormInput id="confirmPin" label="Confirm New PIN" type="password" value={confirmPin} maxLength={8} onChange={(value) => updateFormField('confirmPin', value)} />
                <ActionButton loading={loading}>Reset PIN</ActionButton>
            </form>
        )}

        {view === 'TWO_FACTOR' && twoFactorState && (
            <form onSubmit={handleTwoFactorVerify}>
                <p className="text-sm text-brand-secondary-text mb-4">Enter the 6-digit code sent to <span className="font-semibold">{twoFactorState.email}</span>.</p>
                <FormInput id="twoFactorCode" label="Verification Code" type="text" value={twoFactorCode} maxLength={6} onChange={(value) => setTwoFactorCode(value)} />
                <ActionButton loading={loading}>Verify Code</ActionButton>
                <button type="button" onClick={handleResendTwoFactor} className="mt-3 text-brand-secondary-text hover:text-brand-primary text-sm">Resend Code</button>
            </form>
        )}

        {view === 'LOGIN' && (
            <div className="flex justify-between w-64">
                <button onClick={() => changeView('REGISTER')} className="text-brand-secondary-text hover:text-brand-primary">Register</button>
                <button onClick={() => changeView('FORGOT_PIN_NAME')} className="text-brand-secondary-text hover:text-brand-primary">Forgot PIN?</button>
            </div>
        )}
        {view === 'REGISTER' && (
             <button onClick={() => changeView('LOGIN')} className="text-brand-secondary-text hover:text-brand-primary">Already have an account? Login</button>
        )}
        {(view === 'FORGOT_PIN_NAME' || view === 'FORGOT_PIN_CODE' || view === 'FORGOT_PIN_RESET') && (
            <button onClick={() => changeView('LOGIN')} className="text-brand-secondary-text hover:text-brand-primary">&larr; Back to Login</button>
        )}
        {view === 'TWO_FACTOR' && (
            <div className="flex flex-col items-center space-y-2">
              <button onClick={() => handleResendTwoFactor()} className="text-brand-secondary-text hover:text-brand-primary">Didn't get a code? Resend</button>
              <button onClick={() => changeView('LOGIN')} className="text-brand-secondary-text hover:text-brand-primary">&larr; Back to Login</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;





