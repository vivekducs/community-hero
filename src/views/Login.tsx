import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Mail, Lock, Loader2, ArrowRight, Shield, Users, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { getFriendlyErrorMessage } from '../utils/errors';

export default function Login() {
  const { user, loading, login, loginWithGoogle, loginAsGuest, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'citizen' | 'authority'>('citizen');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Determine redirect path
  const from = location.state?.from?.pathname || '/';
  const targetPath = (from === '/login' || from === '/signup') ? '/' : from;

  // Automatically redirect if user is already authenticated or becomes authenticated (e.g. from redirect)
  useEffect(() => {
    if (user && !loading) {
      navigate(targetPath, { replace: true });
    }
  }, [user, loading, navigate, targetPath]);

  useEffect(() => {
    if (authError) {
      setServerError(getFriendlyErrorMessage(authError));
    }
  }, [authError]);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      console.error(err);
      setServerError(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-4 bg-slate-50" id="login-view">
      {/* Top Header Navigation for easy escape */}
      <div className="w-full max-w-md flex justify-start mb-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-navy transition-colors duration-150"
          id="btn-back-to-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home Page
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/80 shadow-md space-y-6"
      >
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#003366] text-white shadow-lg shadow-navy/10 mb-2">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">CityMind Hub</h2>
          <p className="text-sm text-slate-500">Transforming local civic response with agentic intelligence</p>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-slate-100 rounded-xl" id="login-tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setServerError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 ${
              activeTab === 'citizen'
                ? 'bg-white text-[#003366] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Citizen Access
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('authority');
              setServerError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 ${
              activeTab === 'authority'
                ? 'bg-white text-[#003366] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            Authority Portal
          </button>
        </div>

        {serverError && (
          <div className="space-y-4" id="login-error-container">
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start gap-2" id="login-server-error">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{serverError}</span>
            </div>

            {serverError.includes('not authorized for Google Sign-In') && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3" id="firebase-auth-domain-setup-guide">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  Firebase Quick Setup Guide
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  To log in with Google on this production domain, you must authorize it in your Firebase project settings:
                </p>
                <ol className="list-decimal list-inside text-xs text-amber-800 space-y-1.5 pl-1">
                  <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-900">Firebase Console</a>.</li>
                  <li>Open your project: <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">tranquil-atom-8gbcx</code>.</li>
                  <li>Click on <strong className="font-semibold">Authentication</strong> (left sidebar) &rarr; <strong className="font-semibold">Settings</strong> tab.</li>
                  <li>Under <strong className="font-semibold">Authorized domains</strong>, click <strong className="font-semibold">Add domain</strong>.</li>
                  <li>Enter <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">{typeof window !== 'undefined' ? window.location.hostname : 'citymind-450881698464.us-west1.run.app'}</code> and click <strong className="font-semibold">Add</strong>.</li>
                </ol>
                <div className="pt-1 text-[11px] text-amber-600 italic">
                  Once added, sign-in will work immediately without redeploying the app!
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'citizen' ? (
          /* Citizen View */
          <div className="space-y-5 py-2" id="citizen-access-panel">
            {/* Warning when inside a constrained iframe preview */}
            {isInIframe && (
              <div className="p-4 bg-amber-50/85 border border-amber-200 text-amber-950 text-xs rounded-xl space-y-2" id="iframe-auth-warning">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Preview Sandbox Detected
                </div>
                <p className="leading-relaxed">
                  Browser privacy security policies inside this preview frame can block Google popup authorization. If Google Sign-In loops, click the <strong>"Open in New Tab"</strong> icon in the top right, or use the 1-click sandbox access below.
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-2">
              <Sparkles className="w-5 h-5 text-amber-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">No Account Setup Required</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Citizens can access the map, report public safety issues, check reputation points, and participate in peer-verification instantly using Google Sign-In.
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  console.log("🚀 [Auth Debug] Google Sign-In button clicked.");
                  setSubmitting(true);
                  setServerError(null);
                  await loginWithGoogle();
                  console.log("🚀 [Auth Debug] loginWithGoogle resolved successfully, starting navigation.");
                  console.log(`🚀 [Auth Debug] Navigation started: Redirecting to target path "${targetPath}"`);
                  navigate(targetPath, { replace: true });
                  console.log("🚀 [Auth Debug] Navigation completed successfully.");
                } catch (err: any) {
                  console.error("❌ [Auth Debug] Google Sign-In button flow encountered an error:", err);
                  setServerError(err.message || 'Failed to sign in with Google.');
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="w-full h-12 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all duration-150 shadow-sm cursor-pointer border-b-2"
              id="btn-google-login"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.81 15.69 17.61V20.35H19.26C21.35 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                    <path d="M12 23C14.97 23 17.46 22.02 19.26 20.35L15.69 17.61C14.71 18.27 13.46 18.66 12 18.66C9.18 18.66 6.78 16.76 5.86 14.22H2.18V17.07C4.01 20.7 7.72 23 12 23Z" fill="#34A853"/>
                    <path d="M5.86 14.22C5.63 13.52 5.5 12.78 5.5 12C5.5 11.22 5.63 10.48 5.86 9.78V6.93H2.18C1.42 8.44 1 10.17 1 12C1 13.83 1.42 15.56 2.18 17.07L5.86 14.22Z" fill="#FBBC05"/>
                    <path d="M12 5.34C13.62 5.34 15.06 5.9 16.21 6.99L19.34 3.86C17.46 2.11 14.97 1 12 1C7.72 1 4.01 3.3 2.18 6.93L5.86 9.78C6.78 7.24 9.18 5.34 12 5.34Z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* Separator */}
            <div className="relative flex py-1 items-center text-slate-300">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Or Sandbox Access</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Robust Guest/Sandbox Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  setSubmitting(true);
                  setServerError(null);
                  await loginAsGuest("Sentinel Citizen");
                  navigate(targetPath, { replace: true });
                } catch (err: any) {
                  setServerError(err.message || 'Failed to enter sandbox mode.');
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="w-full h-12 bg-[#003366] hover:bg-[#002244] text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all duration-150 shadow-md cursor-pointer"
              id="btn-sandbox-citizen"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  Continue as Sandbox Citizen (1-Click)
                </>
              )}
            </button>

            <div className="text-center pt-2 text-xs text-slate-500 space-y-2">
              <p>
                Want a dedicated secure account?{' '}
                <Link to="/signup" className="font-semibold text-navy hover:underline" id="link-signup">
                  Register with Email &rarr;
                </Link>
              </p>
              <p>
                Already have an email account?{' '}
                <button 
                  type="button"
                  onClick={() => setActiveTab('authority')} 
                  className="font-semibold text-navy hover:underline cursor-pointer bg-transparent border-none p-0 inline"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* Authority View (Email/Password) */
          <div className="space-y-4" id="authority-access-panel">
            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Official Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="email"
                    {...register('email', { 
                      required: 'Official email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    placeholder="officer@citymind.gov"
                    className="w-full h-11 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all duration-150"
                  />
                </div>
                {errors.email && (
                  <span className="text-xs font-medium text-red-600">{errors.email.message}</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Security Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="password"
                    {...register('password', { 
                      required: 'Password is required'
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
                    Sign In to Authority Console
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
