import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { getFriendlyErrorMessage } from '../utils/errors';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Determine redirect path
  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      setServerError(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4 bg-gradient-to-tr from-saffron/5 via-white to-slate-50/30" id="login-view">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl space-y-6"
      >
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy text-white shadow-lg shadow-navy/10 mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to CityMind</h2>
          <p className="text-sm text-slate-500">Sign in to report issues and verify your neighborhood</p>
        </div>

        {serverError && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl" id="login-server-error">
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                placeholder="you@example.com"
                className="w-full h-11 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all duration-150"
              />
            </div>
            {errors.email && (
              <span className="text-xs font-medium text-red-600">{errors.email.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Password</label>
              <a href="#" className="text-xs font-semibold text-navy hover:text-navy-hover">Forgot?</a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="password"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                placeholder="••••••••"
                className="w-full h-11 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all duration-150"
              />
            </div>
            {errors.password && (
              <span className="text-xs font-medium text-red-600">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-navy hover:bg-navy-hover active:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
            id="btn-login-submit"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center text-slate-300">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase">Or</span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              setSubmitting(true);
              setServerError(null);
              await loginWithGoogle();
              navigate(from, { replace: true });
            } catch (err: any) {
              setServerError(err.message || 'Failed to sign in with Google.');
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="w-full h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.81 15.69 17.61V20.35H19.26C21.35 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
            <path d="M12 23C14.97 23 17.46 22.02 19.26 20.35L15.69 17.61C14.71 18.27 13.46 18.66 12 18.66C9.18 18.66 6.78 16.76 5.86 14.22H2.18V17.07C4.01 20.7 7.72 23 12 23Z" fill="#34A853"/>
            <path d="M5.86 14.22C5.63 13.52 5.5 12.78 5.5 12C5.5 11.22 5.63 10.48 5.86 9.78V6.93H2.18C1.42 8.44 1 10.17 1 12C1 13.83 1.42 15.56 2.18 17.07L5.86 14.22Z" fill="#FBBC05"/>
            <path d="M12 5.34C13.62 5.34 15.06 5.9 16.21 6.99L19.34 3.86C17.46 2.11 14.97 1 12 1C7.72 1 4.01 3.3 2.18 6.93L5.86 9.78C6.78 7.24 9.18 5.34 12 5.34Z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        {/* Toggle sign up */}
        <p className="text-center text-sm text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/signup" className="font-semibold text-navy hover:text-navy-hover" id="link-to-signup">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
