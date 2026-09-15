import { useState } from 'react';
import { useAuth, PATIENT_USER, DOCTOR_USER } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resetDemoDB } from '../lib/db';
import { MyVitaLogo } from './MyVitaLogo';
import {
  RotateCcw,
  UserCheck,
  ChevronDown,
  Check,
  Wifi,
  LogOut,
  UserPlus,
  Shield,
} from 'lucide-react';

interface NavbarProps {
  onOpenScan?: () => void;
  onOpenDoctorSimulator?: () => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
}

export function Navbar({ onOpenAuth }: NavbarProps) {
  const { currentUser, currentRole, loginAs, logout, setShowLoginModal } = useAuth();
  const { showToast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDemo = async () => {
    if (confirm('Reset demo data? This will restore the 8 sample BP readings, default emergency card, and clear custom consents.')) {
      setIsResetting(true);
      try {
        await resetDemoDB();
        showToast('Demo reset successfully', 'success', '8 BP readings restored across 14-day baseline');
        setDropdownOpen(false);
      } catch (err) {
        showToast('Failed to reset demo', 'error');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2">
          <MyVitaLogo size="md" showText={true} showTagline={true} />
          <span className="hidden lg:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/70 ml-2">
            Local Health Vault
          </span>
        </div>

        {/* Right actions: Sync status, Role Switcher, Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time BroadcastChannel sync indicator */}
          <div
            id="sync-status-indicator"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium"
            title="Real-time multi-tab & cross-device sync active via Modiqo.ai (Rote) engine"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Wifi className="w-3.5 h-3.5" />
            <span>Sync Live</span>
          </div>

          {/* Quick Role / User Switcher */}
          <div className="relative">
            <button
              id="role-switch-dropdown-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              {currentRole === 'patient' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
              )}
              <span className="max-w-[130px] truncate sm:max-w-none">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div
                id="role-dropdown-menu"
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Current User Profile</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                      {currentUser.id}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                </div>

                <div className="px-3 pt-2 pb-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Switch Demo Role</p>
                </div>

                <button
                  id="switch-to-patient-btn"
                  onClick={() => {
                    loginAs('patient');
                    setDropdownOpen(false);
                    showToast('Switched to Patient view', 'info', 'Personal Vault unlocked');
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentRole === 'patient' ? 'bg-teal-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                      AS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{PATIENT_USER.name}</p>
                      <p className="text-[10px] text-slate-500">Patient • Local Vault</p>
                    </div>
                  </div>
                  {currentRole === 'patient' && <Check className="w-4 h-4 text-teal-600" />}
                </button>

                <button
                  id="switch-to-doctor-btn"
                  onClick={() => {
                    loginAs('doctor');
                    setDropdownOpen(false);
                    showToast('Switched to Clinician view', 'info', 'Doctor Dashboard & Consent Scanner');
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentRole === 'doctor' ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      DS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{DOCTOR_USER.name}</p>
                      <p className="text-[10px] text-slate-500">Doctor • Recipient Portal</p>
                    </div>
                  </div>
                  {currentRole === 'doctor' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <div className="my-1.5 border-t border-slate-100"></div>

                {/* Sign Up New Register button */}
                <button
                  id="open-register-screen-btn"
                  onClick={() => {
                    setDropdownOpen(false);
                    if (onOpenAuth) {
                      onOpenAuth('signup');
                    } else {
                      logout();
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-lime-700 hover:bg-lime-50 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-lime-600" />
                  <span>Register New Account (Sign Up)</span>
                </button>

                {/* Open Full Sign In */}
                <button
                  id="open-login-portal-btn"
                  onClick={() => {
                    setDropdownOpen(false);
                    if (onOpenAuth) {
                      onOpenAuth('login');
                    } else {
                      logout();
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <span>Open Sign In / Register Page</span>
                </button>

                {/* Sign out */}
                <button
                  id="sign-out-btn"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                    showToast('Signed out of MyVita', 'info');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Sign Out</span>
                </button>

                <div className="my-1 border-t border-slate-100"></div>

                <button
                  id="reset-demo-btn"
                  disabled={isResetting}
                  onClick={handleResetDemo}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <RotateCcw className={`w-4 h-4 text-rose-500 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>{isResetting ? 'Resetting DB...' : 'Reset Demo (Restore 8 BP)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Sign Out / Switch to Login */}
          <button
            id="nav-logout-action-btn"
            onClick={() => {
              logout();
              showToast('Navigating to Login / Register page', 'info');
            }}
            title="Sign out / Switch account"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          {/* Quick Reset Demo button on desktop */}
          <button
            id="nav-reset-demo-action"
            onClick={handleResetDemo}
            title="Clear and reset 8 baseline readings"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
