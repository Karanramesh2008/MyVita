import React, { useState } from 'react';
import { useAuth, PATIENT_USER, DOCTOR_USER } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MyVitaLogo } from './MyVitaLogo';
import { UserRole } from '../types';
import {
  Lock,
  Mail,
  KeyRound,
  User,
  Shield,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Award,
  Sparkles,
  QrCode,
  Clock,
  HeartPulse,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
  canCancel?: boolean;
  onCancel?: () => void;
}

export function AuthPage({
  initialMode = 'login',
  onSuccess,
  canCancel = false,
  onCancel,
}: AuthPageProps) {
  const { loginWithCredentials, registerUser, loginAs, registeredAccounts } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('ananya.sharma@myvita.health');
  const [loginPassword, setLoginPassword] = useState('demo123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regRole, setRegRole] = useState<UserRole>('patient');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('Cardiology');
  const [regLicense, setRegLicense] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const res = loginWithCredentials(loginEmail, loginPassword);
      if (res.success) {
        showToast('Welcome back to MyVita', 'success', `Signed in as ${loginEmail}`);
        if (onSuccess) onSuccess();
      } else {
        setLoginError(res.message || 'Failed to sign in.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim()) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 4) {
      setRegError('Password should be at least 4 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = registerUser({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        phone: regPhone || undefined,
        specialty: regRole === 'doctor' ? regSpecialty : undefined,
        licenseNumber: regRole === 'doctor' ? regLicense || 'MD-ACTIVE' : undefined,
      });

      if (res.success) {
        showToast(
          'Registration Successful!',
          'success',
          `Welcome to MyVita, ${regName}! Your personal ${regRole === 'patient' ? 'health vault' : 'clinician portal'} is active.`
        );
        if (onSuccess) onSuccess();
      } else {
        setRegError(res.message || 'Registration failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    loginAs(role);
    showToast(
      `Instant Demo: Signed in as ${role === 'patient' ? PATIENT_USER.name : DOCTOR_USER.name}`,
      'success',
      `${role === 'patient' ? 'Patient Vault unlocked' : 'Clinician Review Dashboard active'}`
    );
    if (onSuccess) onSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-100 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 antialiased selection:bg-teal-500 selection:text-white">
      {/* Container */}
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Banner Card */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <MyVitaLogo size="lg" showText={true} showTagline={true} />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto font-medium">
            The consent layer health data has been missing. Private vault storage with scoped QR sharing.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden">
          {/* Header Switcher Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1.5">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setMode('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-4 h-4 text-teal-600" />
              <span>Sign In</span>
            </button>
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => {
                setMode('signup');
                setRegError(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-lime-600" />
              <span>Sign Up (New Register)</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* ===================== MODE: SIGN IN ===================== */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. ananya.sharma@myvita.health"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password / Passcode
                    </label>
                    <span className="text-[11px] text-teal-600 font-medium hover:underline cursor-pointer">
                      Passcode demo: demo123
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="submit-login-button"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Sign In to MyVita Vault</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 1-Click Demo Profiles for Hackathon Evaluation */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-600">
                      1-Click Hackathon Demo Logins
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-lime-100 text-lime-900 border border-lime-200">
                      Quick Access
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="quick-login-patient-btn"
                      type="button"
                      onClick={() => handleQuickLogin('patient')}
                      className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/60 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                          AS
                        </div>
                        <span className="text-xs font-bold text-slate-900">Ananya S.</span>
                      </div>
                      <p className="text-[10px] text-teal-800 font-medium">Patient • Vault Owner</p>
                    </button>

                    <button
                      id="quick-login-doctor-btn"
                      type="button"
                      onClick={() => handleQuickLogin('doctor')}
                      className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          DS
                        </div>
                        <span className="text-xs font-bold text-slate-900">Dr. Sharma</span>
                      </div>
                      <p className="text-[10px] text-indigo-800 font-medium">Cardiologist • Recipient</p>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ===================== MODE: SIGN UP (NEW REGISTER) ===================== */}
            {mode === 'signup' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {regError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Role Picker: Patient vs Doctor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="reg-role-patient"
                      type="button"
                      onClick={() => setRegRole('patient')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        regRole === 'patient'
                          ? 'border-teal-500 bg-teal-50 text-slate-900 ring-2 ring-teal-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <User className="w-4 h-4 text-teal-600" />
                        <span>Patient</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Store private BP, create scoped QR tokens
                      </p>
                    </button>

                    <button
                      id="reg-role-doctor"
                      type="button"
                      onClick={() => setRegRole('doctor')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        regRole === 'doctor'
                          ? 'border-indigo-500 bg-indigo-50 text-slate-900 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Stethoscope className="w-4 h-4 text-indigo-600" />
                        <span>Doctor / Clinician</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Scan tokens, review patient trends & MAP
                      </p>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reg-name-input"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={regRole === 'patient' ? 'e.g. Maya Patel' : 'e.g. Dr. Rajesh Verma, MD'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reg-email-input"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. user@myvita.health"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Doctor-specific fields */}
                {regRole === 'doctor' && (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Specialty
                      </label>
                      <input
                        id="reg-specialty-input"
                        type="text"
                        value={regSpecialty}
                        onChange={(e) => setRegSpecialty(e.target.value)}
                        placeholder="Cardiology"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        License / ID
                      </label>
                      <input
                        id="reg-license-input"
                        type="text"
                        value={regLicense}
                        onChange={(e) => setRegLicense(e.target.value)}
                        placeholder="MD-4091"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Patient-specific phone / contact */}
                {regRole === 'patient' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number (Optional for Emergency QR)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-phone-input"
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-slate-50/50"
                      />
                    </div>
                  </div>
                )}

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <input
                      id="reg-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 chars"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm
                    </label>
                    <input
                      id="reg-confirm-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="submit-register-button"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold text-sm shadow-md shadow-lime-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Register New Account & Enter MyVita</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Card Footer Features */}
          <div className="bg-slate-50/90 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>Private On-Device Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-lime-600" />
              <span>Zero Raw Data Transferred</span>
            </div>
          </div>
        </div>

        {/* Optional cancel button if opened from inside the app */}
        {canCancel && onCancel && (
          <div className="text-center">
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Return to Current Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
