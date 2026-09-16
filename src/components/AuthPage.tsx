import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  User,
  Phone,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

import {
  useAuth,
  RegisterPayload,
} from '../context/AuthContext';

import { UserRole } from '../types';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export default function AuthPage({
  initialMode = 'login',
  onSuccess,
}: AuthPageProps) {

  const {
    loginWithCredentials,
    loginAs,
    registerUser,
  } = useAuth();

  const [mode, setMode] =
    useState<'login' | 'register'>(
      initialMode
    );

  const [role, setRole] =
    useState<UserRole>('patient');

  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [specialty, setSpecialty] =
    useState('');

  const [licenseNumber, setLicenseNumber] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // ====================================================
  // LOGIN
  // ====================================================

  const handleLogin = (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    setError('');

    if (!email.trim()) {
      setError(
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter your password.'
      );
      return;
    }

    setLoading(true);

    const result =
      loginWithCredentials(
        email,
        password
      );

    setLoading(false);

    if (!result.success) {
      setError(
        result.message ||
        'Unable to sign in.'
      );
      return;
    }

    onSuccess?.();
  };

  // ====================================================
  // REGISTER
  // ====================================================

  const handleRegister = (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    setError('');

    if (!name.trim()) {
      setError(
        'Please enter your name.'
      );
      return;
    }

    if (!email.trim()) {
      setError(
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter a password.'
      );
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must contain at least 6 characters.'
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );
      return;
    }

    if (
      role === 'doctor' &&
      !specialty.trim()
    ) {
      setError(
        'Please enter your medical specialty.'
      );
      return;
    }

    if (
      role === 'doctor' &&
      !licenseNumber.trim()
    ) {
      setError(
        'Please enter your medical license number.'
      );
      return;
    }

    setLoading(true);

    const payload: RegisterPayload = {
      name,
      email,
      password,
      role,
      phone,
      specialty:
        role === 'doctor'
          ? specialty
          : undefined,
      licenseNumber:
        role === 'doctor'
          ? licenseNumber
          : undefined,
    };

    const result =
      registerUser(payload);

    setLoading(false);

    if (!result.success) {
      setError(
        result.message ||
        'Unable to create account.'
      );
      return;
    }

    onSuccess?.();
  };

  // ====================================================
  // DEMO LOGIN
  // ====================================================

  const handleDemoLogin = (
    demoRole: UserRole
  ) => {

    setError('');

    setLoading(true);

    loginAs(demoRole);

    setLoading(false);

    onSuccess?.();
  };

  // ====================================================
  // SWITCH MODE
  // ====================================================

  const switchMode = (
    newMode: 'login' | 'register'
  ) => {
    setError('');
    setMode(newMode);
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">

      <div className="w-full max-w-5xl">

        {/* ============================================
            HEADER / LOGO
        ============================================ */}

        <div className="text-center mb-8">

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200">

            <HeartPulse
              size={32}
              strokeWidth={2.5}
            />

          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            MyVita
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Your health. Your data. Your control.
          </p>

        </div>

        {/* ============================================
            MAIN CARD
        ============================================ */}

        <div className="grid lg:grid-cols-2 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">

          {/* ==========================================
              LEFT SIDE
          ========================================== */}

          <div className="hidden lg:flex bg-teal-700 text-white p-10 flex-col justify-between">

            <div>

              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-sm font-semibold">
                <ShieldCheck size={17} />
                Secure Health Vault
              </div>

              <h2 className="mt-8 text-4xl font-black leading-tight">
                Your complete
                <br />
                health journey,
                <br />
                in one place.
              </h2>

              <p className="mt-5 text-teal-50 leading-relaxed max-w-md">
                Securely manage your medical records,
                consent, emergency information and
                healthcare connections with MyVita.
              </p>

            </div>

            <div className="mt-10 space-y-4">

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Lock size={18} />
                </div>
                <span className="text-sm">
                  Private health data
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <span className="text-sm">
                  Consent-based sharing
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <HeartPulse size={18} />
                </div>
                <span className="text-sm">
                  Emergency-ready access
                </span>
              </div>

            </div>

          </div>

          {/* ==========================================
              RIGHT SIDE
          ========================================== */}

          <div className="p-6 sm:p-10">

            {/* MODE SWITCH */}

            <div className="flex p-1 bg-slate-100 rounded-xl mb-7">

              <button
                type="button"
                onClick={() =>
                  switchMode('login')
                }
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() =>
                  switchMode('register')
                }
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Create Account
              </button>

            </div>

            <div className="mb-6">

              <h2 className="text-2xl font-black text-slate-900">
                {mode === 'login'
                  ? 'Welcome back'
                  : 'Create your MyVita account'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {mode === 'login'
                  ? 'Sign in to access your health dashboard.'
                  : 'Set up your secure personal health space.'}
              </p>

            </div>

            {/* ERROR */}

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* ========================================
                LOGIN FORM
            ======================================== */}

            {mode === 'login' && (
              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >

                {/* EMAIL */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Email address
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />

                  </div>

                </div>

                {/* PASSWORD */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Password
                  </label>

                  <div className="relative">

                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {loading
                    ? 'Signing in...'
                    : 'Sign In'}

                  {!loading && (
                    <ArrowRight size={18} />
                  )}
                </button>

                {/* DEMO LOGIN */}

                <div className="relative my-6">

                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>

                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Demo Access
                    </span>
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      handleDemoLogin(
                        'patient'
                      )
                    }
                    className="py-3 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 font-bold text-sm hover:bg-teal-100 transition"
                  >
                    Patient Demo
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      handleDemoLogin(
                        'doctor'
                      )
                    }
                    className="py-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition"
                  >
                    Doctor Demo
                  </button>

                </div>

                <p className="text-center text-xs text-slate-400">
                  Patient demo: demo123
                  <br />
                  Doctor demo: doctor123
                </p>

              </form>
            )}

            {/* ========================================
                REGISTER FORM
            ======================================== */}

            {mode === 'register' && (
              <form
                onSubmit={handleRegister}
                className="space-y-4"
              >

                {/* ROLE */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Account type
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setRole('patient')
                      }
                      className={`p-4 rounded-xl border text-left transition ${
                        role === 'patient'
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >

                      <User
                        size={20}
                        className={
                          role === 'patient'
                            ? 'text-teal-600'
                            : 'text-slate-400'
                        }
                      />

                      <div className="mt-2 text-sm font-bold text-slate-900">
                        Patient
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Personal health vault
                      </div>

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setRole('doctor')
                      }
                      className={`p-4 rounded-xl border text-left transition ${
                        role === 'doctor'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >

                      <Stethoscope
                        size={20}
                        className={
                          role === 'doctor'
                            ? 'text-indigo-600'
                            : 'text-slate-400'
                        }
                      />

                      <div className="mt-2 text-sm font-bold text-slate-900">
                        Doctor
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Clinical dashboard
                      </div>

                    </button>

                  </div>

                </div>

                {/* NAME */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Full name
                  </label>

                  <div className="relative">

                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />

                  </div>

                </div>

                {/* EMAIL */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Email address
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />

                  </div>

                </div>

                {/* PHONE */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Phone
                  </label>

                  <div className="relative">

                    <Phone
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value
                        )
                      }
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />

                  </div>

                </div>

                {/* DOCTOR DETAILS */}

                {role === 'doctor' && (
                  <div className="grid sm:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Specialty
                      </label>

                      <div className="relative">

                        <Stethoscope
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          type="text"
                          value={specialty}
                          onChange={(event) =>
                            setSpecialty(
                              event.target.value
                            )
                          }
                          placeholder="Cardiology"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                        />

                      </div>

                    </div>

                    <div>

                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        License number
                      </label>

                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(event) =>
                          setLicenseNumber(
                            event.target.value
                          )
                        }
                        placeholder="Medical license"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                      />

                    </div>

                  </div>
                )}

                {/* PASSWORD */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Password
                  </label>

                  <div className="relative">

                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* CONFIRM PASSWORD */}

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Confirm password
                  </label>

                  <div className="relative">

                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder="Repeat your password"
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {loading
                    ? 'Creating account...'
                    : 'Create Account'}

                  {!loading && (
                    <ArrowRight size={18} />
                  )}
                </button>

              </form>
            )}

            {/* FOOTER */}

            <div className="mt-7 text-center">

              <p className="text-xs text-slate-400">
                {mode === 'login'
                  ? "Don't have an account?"
                  : 'Already have an account?'}
              </p>

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    mode === 'login'
                      ? 'register'
                      : 'login'
                  )
                }
                className="mt-1 text-sm font-bold text-teal-600 hover:text-teal-700"
              >
                {mode === 'login'
                  ? 'Create an account'
                  : 'Sign in instead'}
              </button>

            </div>

          </div>

        </div>

        {/* SECURITY FOOTER */}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={14} />
          <span>
            MyVita keeps your health information under your control.
          </span>
        </div>

      </div>

    </div>
  );
}