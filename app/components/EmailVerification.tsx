// app/components/EmailVerification.tsx
'use client';

import React, { useState } from 'react';

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({ email, onVerified }) => {
  const [otp, setOtp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const startResendCountdown = (): void => {
    setResendDisabled(true);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendVerificationEmail = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) throw new Error('Failed to send verification code');
      startResendCountdown();

    } catch (error: any) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      onVerified();
    } catch (error: any) {
      setError(error.message || 'Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-semibold text-center mb-6">Verify Your Email</h2>

      <p className="text-gray-600 mb-6 text-center">
        We&apos;ve sent a verification code to:<br/>
        <span className="font-medium">{email}</span>
      </p>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={verifyOtp} className="space-y-4">
        <div>
          <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
            Verification Code
          </label>
          <input
            id="otp"
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-xl"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className={`w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            (isLoading || otp.length !== 6) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={sendVerificationEmail}
          disabled={resendDisabled || isLoading}
          className={`text-sm text-blue-600 hover:text-blue-700 ${
            (resendDisabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {resendDisabled
            ? `Resend code in ${countdown}s`
            : 'Resend verification code'
          }
        </button>
      </div>
    </div>
  );
};

export default EmailVerification;