import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserSession, AuthAccount } from '../types';
import { setDbUser } from '../lib/db';

export const PATIENT_USER: UserSession = {
  role: 'patient',
  name: 'Ananya Sharma',
  title: 'Patient (Personal Vault)',
  id: 'MV-PT-8829',
  avatarColor: 'teal',
  email: 'ananya.sharma@myvita.health',
  phone: '+91-9876543210',
  isDemo: true,
};

export const DOCTOR_USER: UserSession = {
  role: 'doctor',
  name: 'Dr. A. Sharma, MD',
  title: 'Chief Cardiologist, St. Jude Medical',
  id: 'MV-DR-1094',
  avatarColor: 'indigo',
  email: 'dr.sharma@cardiology.stjude.org',
  specialty: 'Cardiology',
  licenseNumber: 'MD-99482-CA',
  isDemo: true,
};

const DEFAULT_ACCOUNTS: AuthAccount[] = [
  {
    ...PATIENT_USER,
    passwordHash: 'demo123',
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    ...DOCTOR_USER,
    passwordHash: 'doctor123',
    specialty: 'Cardiology',
    licenseNumber: 'MD-99482-CA',
    createdAt: Date.now() - 86400000 * 30,
  },
];

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  licenseNumber?: string;
}

interface AuthContextValue {
  currentUser: UserSession;
  currentRole: UserRole;
  isLoggedIn: boolean;
  registeredAccounts: AuthAccount[];
  loginAs: (role: UserRole) => void;
  loginWithCredentials: (email: string, password?: string) => { success: boolean; message?: string };
  registerUser: (payload: RegisterPayload) => { success: boolean; message?: string };
  logout: () => void;
  switchRole: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AuthAccount[]>(() => {
    try {
      const saved = localStorage.getItem('myvita_accounts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    try {
      const savedUser = localStorage.getItem('myvita_current_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      const savedRole = localStorage.getItem('myvita_active_role') || localStorage.getItem('vh_active_role');
      return savedRole === 'doctor' ? DOCTOR_USER : PATIENT_USER;
    } catch (e) {
      return PATIENT_USER;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const savedState = localStorage.getItem('myvita_logged_in');
      return savedState !== null ? savedState === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('myvita_accounts', JSON.stringify(accounts));
    } catch (e) {
      // ignore
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('myvita_current_user', JSON.stringify(currentUser));
      localStorage.setItem('myvita_active_role', currentUser.role);
      localStorage.setItem('myvita_logged_in', String(isLoggedIn));
    } catch (e) {
      // ignore
    }
    setDbUser({
      id: currentUser.id,
      name: currentUser.name,
      phone: currentUser.phone,
      isDemo: currentUser.isDemo,
    });
  }, [currentUser, isLoggedIn]);

  const loginAs = (role: UserRole) => {
    const existing = accounts.find((a) => a.role === role);
    if (existing) {
      setCurrentUser(existing);
      setDbUser({
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        isDemo: existing.isDemo,
      });
    } else {
      const fallback = role === 'patient' ? PATIENT_USER : DOCTOR_USER;
      setCurrentUser(fallback);
      setDbUser({
        id: fallback.id,
        name: fallback.name,
        phone: fallback.phone,
        isDemo: fallback.isDemo,
      });
    }
    setIsLoggedIn(true);
    setShowLoginModal(false);
  };

  const loginWithCredentials = (email: string, password?: string): { success: boolean; message?: string } => {
    const match = accounts.find(
      (a) => a.email.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!match) {
      return { success: false, message: 'Account not found with this email. Please check your credentials or register a new account.' };
    }

    if (password && match.passwordHash && match.passwordHash !== password) {
      return { success: false, message: 'Incorrect password. (Try "demo123" for patient, "doctor123" for doctor)' };
    }

    setCurrentUser(match);
    setDbUser({
      id: match.id,
      name: match.name,
      phone: match.phone,
      isDemo: match.isDemo,
    });
    setIsLoggedIn(true);
    setShowLoginModal(false);
    return { success: true };
  };

  const registerUser = (payload: RegisterPayload): { success: boolean; message?: string } => {
    if (!payload.email || !payload.name) {
      return { success: false, message: 'Name and email are required.' };
    }

    const existing = accounts.find(
      (a) => a.email.toLowerCase().trim() === payload.email.toLowerCase().trim()
    );
    if (existing) {
      return { success: false, message: 'An account with this email already exists. Please sign in.' };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = payload.role === 'patient' ? `MV-PT-${randomSuffix}` : `MV-DR-${randomSuffix}`;

    const newAccount: AuthAccount = {
      id: newId,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      role: payload.role,
      isDemo: false, // New registered user has NO demo data!
      title:
        payload.role === 'patient'
          ? 'Patient (Personal Vault)'
          : payload.specialty
          ? `${payload.specialty} Specialist`
          : 'Licensed Clinician',
      avatarColor: payload.role === 'patient' ? 'teal' : 'indigo',
      passwordHash: payload.password || 'password123',
      phone: payload.phone,
      specialty: payload.specialty,
      licenseNumber: payload.licenseNumber,
      createdAt: Date.now(),
    };

    setAccounts((prev) => [...prev, newAccount]);
    setDbUser({
      id: newAccount.id,
      name: newAccount.name,
      phone: newAccount.phone,
      isDemo: false,
    });
    setCurrentUser(newAccount);
    setIsLoggedIn(true);
    setShowLoginModal(false);

    return { success: true };
  };

  const logout = () => {
    setIsLoggedIn(false);
    setShowLoginModal(false);
  };

  const switchRole = () => {
    if (currentUser.role === 'patient') {
      loginAs('doctor');
    } else {
      loginAs('patient');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        isLoggedIn,
        registeredAccounts: accounts,
        loginAs,
        loginWithCredentials,
        registerUser,
        logout,
        switchRole,
        showLoginModal,
        setShowLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
