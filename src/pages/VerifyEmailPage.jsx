import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const verificationStartedRef = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (verificationStartedRef.current) {
        return;
      }

      verificationStartedRef.current = true;
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing from the link.');
        return;
      }

      try {
        const response = await api.get('/auth/verify-email', {
          params: { token },
        });

        setStatus('success');
        setMessage(response.data?.message || 'Your email has been verified successfully.');
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          'We could not verify this email link. It may be invalid or expired.'
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl bg-white rounded-2xl p-8 sm:p-10 shadow-2xl"
      >
        <Link to="/" className="text-navy-900 font-extrabold text-xl tracking-wider mb-8 block">
          TWIF
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            status === 'success'
              ? 'bg-green-100 text-green-600'
              : status === 'error'
                ? 'bg-red-100 text-red-600'
                : 'bg-accent/10 text-accent'
          }`}>
            {status === 'success' ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : status === 'error' ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <div className="w-6 h-6 border-2 border-current/20 border-t-current rounded-full animate-spin" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {status === 'success'
                ? 'Email verified'
                : status === 'error'
                  ? 'Verification failed'
                  : 'Verifying email'}
            </h1>
            <p className="text-gray-500 mt-1">Twif account verification</p>
          </div>
        </div>

        <div className={`rounded-xl px-4 py-4 text-sm leading-relaxed ${
          status === 'success'
            ? 'bg-green-50 text-green-800 border border-green-100'
            : status === 'error'
              ? 'bg-red-50 text-red-800 border border-red-100'
              : 'bg-gray-50 text-gray-700 border border-gray-100'
        }`}>
          {message}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark transition-colors"
          >
            Go to Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center px-5 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Back to Sign Up
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
