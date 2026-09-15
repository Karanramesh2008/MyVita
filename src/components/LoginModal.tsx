import { useState } from 'react';
import { useAuth, PATIENT_USER, DOCTOR_USER } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield, Lock, Stethoscope, User, ArrowRight, CheckCircle2, KeyRound, Radio } from 'lucide-react';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { loginAs, currentUser } = useAuth();
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [passcode, setPasscode] = useState('••••');

  if (!isOpen) return null;

  const handleLogin = (role: UserRole) => {
    loginAs(role);
    showToast(
      `Authenticated as ${role === 'patient' ? PATIENT_USER.name : DOCTOR_USER.name}`,
      'success',
      `Modiqo.ai (Rote) secure role gateway active: ${role.toUpperCase()} profile`
    );
    if (onClose) onClose();
  };

  return (
    <div
      id="login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
    >
      <div
        id="login-modal-card"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">MyVita Gate</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60">
                  Modiqo.ai Rote
                </span>
              </div>
              <p className="text-xs text-slate-400">Role-Based Cryptographic Access & Secure Routing</p>
            </div>
          </div>
          {onClose && (
            <button
              id="login-modal-close-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors text-sm"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600">
            Select your role to sign in. The local vault enforces strict cryptographically scoped data boundaries.
          </p>

          {/* Role selector cards */}
          <div className="grid grid-cols-1 gap-3">
            {/* Patient Option */}
            <div
              id="role-option-patient"
              onClick={() => setSelectedRole('patient')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedRole === 'patient'
                  ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">Patient Sign In</h4>
                      <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-medium">Vault Owner</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {PATIENT_USER.name} • {PATIENT_USER.id}
                    </p>
                  </div>
                </div>
                {selectedRole === 'patient' && <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-1" />}
              </div>
              <div className="mt-3 pt-3 border-t border-teal-100/60 text-xs text-slate-600 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                <span>Full authority: Scan BP, generate scoped consent QR, toggle emergency card</span>
              </div>
            </div>

            {/* Doctor Option */}
            <div
              id="role-option-doctor"
              onClick={() => setSelectedRole('doctor')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedRole === 'doctor'
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">Clinician / Doctor Sign In</h4>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-medium">Recipient</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {DOCTOR_USER.name} • {DOCTOR_USER.title}
                    </p>
                  </div>
                </div>
                {selectedRole === 'doctor' && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-1" />}
              </div>
              <div className="mt-3 pt-3 border-t border-indigo-100/60 text-xs text-slate-600 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Clinical Dashboard: Scan consent QRs, view scoped trends, compute MAP & BP load</span>
              </div>
            </div>
          </div>

          {/* Demo Biometric/Key Quick Unlock */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span>Session Key: Verified via Modiqo Rote Node</span>
            </div>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
              SHA256-OK
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onClose && (
              <button
                id="login-cancel-button"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
            )}
            <button
              id="login-submit-button"
              type="button"
              onClick={() => handleLogin(selectedRole)}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white shadow-md transition-colors ${
                selectedRole === 'patient'
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <span>Continue as {selectedRole === 'patient' ? 'Patient' : 'Doctor'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
