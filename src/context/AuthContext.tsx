import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, UserSession, AuthAccount } from '../types';
import { setDbUser } from '../lib/db';

// ======================================================
// LOCAL STORAGE KEYS
// ======================================================

const ACCOUNTS_KEY = 'myvita_accounts';
const CURRENT_USER_KEY = 'myvita_current_user';
const ACTIVE_ROLE_KEY = 'myvita_active_role';
const LOGGED_IN_KEY = 'myvita_logged_in';

// ======================================================
// DEMO USERS
// ======================================================

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

// ======================================================
// DEMO ACCOUNTS
// ======================================================

const DEFAULT_ACCOUNTS: AuthAccount[] = [
  {
    ...PATIENT_USER,
    passwordHash: 'demo123',
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    ...DOCTOR_USER,
    passwordHash: 'doctor123',
    createdAt: Date.now() - 86400000 * 30,
  },
];

// ======================================================
// TYPES
// ======================================================

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  licenseNumber?: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  user?: UserSession;
}

interface AuthContextValue {
  currentUser: UserSession;
  currentRole: UserRole;
  isLoggedIn: boolean;
  authLoading: boolean;
  registeredAccounts: AuthAccount[];
  loginAs: (role: UserRole) => void;
  loginWithCredentials: (email: string, password?: string) => AuthResult;
  registerUser: (payload: RegisterPayload) => AuthResult;
  logout: () => void;
  switchRole: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ======================================================
// ACCOUNT HELPERS
// ======================================================

function loadAccounts(): AuthAccount[] {
  try {
    const saved = localStorage.getItem(ACCOUNTS_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed as AuthAccount[];
      }
    }
  } catch (error) {
    console.error('Failed to load MyVita accounts:', error);
  }

  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  return DEFAULT_ACCOUNTS;
}

function saveAccounts(accounts: AuthAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function saveSession(user: UserSession) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem(ACTIVE_ROLE_KEY, user.role);
  localStorage.setItem(LOGGED_IN_KEY, 'true');
}

function clearStoredSession() {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(ACTIVE_ROLE_KEY);
  localStorage.removeItem(LOGGED_IN_KEY);
}

function syncDatabaseUser(user: UserSession | null) {
  if (!user) return;

  setDbUser({
    id: user.id,
    name: user.name,
    phone: user.phone,
    isDemo: user.isDemo,
  });
}

// ======================================================
// AUTH PROVIDER
// ======================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Keep a non-null profile for existing Navbar/LoginModal code.
  // It is NOT considered authenticated until isLoggedIn === true.
  const [currentUser, setCurrentUser] = useState<UserSession>(PATIENT_USER);
  const [currentRole, setCurrentRole] = useState<UserRole>('patient');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [accounts, setAccounts] = useState<AuthAccount[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ----------------------------------------------------
  // RESTORE SESSION ON FIRST LOAD
  // ----------------------------------------------------

  useEffect(() => {
    const storedAccounts = loadAccounts();
    setAccounts(storedAccounts);

    try {
      const loggedIn = localStorage.getItem(LOGGED_IN_KEY) === 'true';
      const savedUser = localStorage.getItem(CURRENT_USER_KEY);
      const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole | null;

      // No saved session = logged out.
      if (!loggedIn || !savedUser) {
        clearStoredSession();
        setIsLoggedIn(false);
        setCurrentRole('patient');
        return;
      }

      const parsedUser = JSON.parse(savedUser) as UserSession;

      const accountExists = storedAccounts.some(
        (account) =>
          account.email.toLowerCase().trim() ===
          parsedUser.email.toLowerCase().trim()
      );

      if (!accountExists) {
        clearStoredSession();
        setIsLoggedIn(false);
        setCurrentRole('patient');
        return;
      }

      // Valid saved session -> restore it.
      setCurrentUser(parsedUser);
      setCurrentRole(savedRole || parsedUser.role);
      setIsLoggedIn(true);
      syncDatabaseUser(parsedUser);
    } catch (error) {
      console.error('Failed to restore MyVita session:', error);
      clearStoredSession();
      setIsLoggedIn(false);
      setCurrentRole('patient');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Persist account changes only. Session state is written explicitly
  // by login/register/logout so an initial render can never create a session.
  useEffect(() => {
    if (accounts.length > 0) {
      try {
        saveAccounts(accounts);
      } catch (error) {
        console.error('Failed to save MyVita accounts:', error);
      }
    }
  }, [accounts]);

  // ----------------------------------------------------
  // LOGIN WITH EMAIL + PASSWORD
  // ----------------------------------------------------

  const loginWithCredentials = (
    email: string,
    password?: string
  ): AuthResult => {
    const normalizedEmail = email.trim().toLowerCase();

    const match = accounts.find(
      (account) => account.email.toLowerCase().trim() === normalizedEmail
    );

    if (!match) {
      return {
        success: false,
        message:
          'Account not found with this email. Please check your credentials or register a new account.',
      };
    }

    if (password && match.passwordHash && match.passwordHash !== password) {
      return {
        success: false,
        message:
          'Incorrect password. (Try "demo123" for patient, "doctor123" for doctor)',
      };
    }

    const user: UserSession = {
      role: match.role,
      name: match.name,
      title: match.title,
      id: match.id,
      avatarColor: match.avatarColor,
      email: match.email,
      phone: match.phone,
      specialty: match.specialty,
      licenseNumber: match.licenseNumber,
      isDemo: match.isDemo,
    };

    setCurrentUser(user);
    setCurrentRole(user.role);
    setIsLoggedIn(true);
    setShowLoginModal(false);

    saveSession(user);
    syncDatabaseUser(user);

    return { success: true, user };
  };

  // ----------------------------------------------------
  // QUICK DEMO LOGIN
  // ----------------------------------------------------

  const loginAs = (role: UserRole) => {
    const demoUser = role === 'patient' ? PATIENT_USER : DOCTOR_USER;

    let updatedAccounts = [...accounts];
    let demoAccount = updatedAccounts.find(
      (account) =>
        account.email.toLowerCase() === demoUser.email.toLowerCase()
    );

    if (!demoAccount) {
      demoAccount = {
        ...demoUser,
        passwordHash: role === 'patient' ? 'demo123' : 'doctor123',
        createdAt: Date.now(),
      };

      updatedAccounts = [...updatedAccounts, demoAccount];
      setAccounts(updatedAccounts);
      saveAccounts(updatedAccounts);
    }

    const user: UserSession = {
      role: demoAccount.role,
      name: demoAccount.name,
      title: demoAccount.title,
      id: demoAccount.id,
      avatarColor: demoAccount.avatarColor,
      email: demoAccount.email,
      phone: demoAccount.phone,
      specialty: demoAccount.specialty,
      licenseNumber: demoAccount.licenseNumber,
      isDemo: demoAccount.isDemo,
    };

    setCurrentUser(user);
    setCurrentRole(role);
    setIsLoggedIn(true);
    setShowLoginModal(false);

    saveSession(user);
    syncDatabaseUser(user);
  };

  // ----------------------------------------------------
  // REGISTER NEW USER
  // ----------------------------------------------------

  const registerUser = (payload: RegisterPayload): AuthResult => {
    const name = payload.name.trim();
    const email = payload.email.trim().toLowerCase();

    if (!name || !email) {
      return {
        success: false,
        message: 'Name and email are required.',
      };
    }

    const existing = accounts.find(
      (account) => account.email.toLowerCase().trim() === email
    );

    if (existing) {
      return {
        success: false,
        message:
          'An account with this email already exists. Please sign in.',
      };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId =
      payload.role === 'patient'
        ? `MV-PT-${randomSuffix}`
        : `MV-DR-${randomSuffix}`;

    const newAccount: AuthAccount = {
      id: newId,
      name,
      email,
      role: payload.role,
      isDemo: false,
      title:
        payload.role === 'patient'
          ? 'Patient (Personal Vault)'
          : payload.specialty
            ? `${payload.specialty} Specialist`
            : 'Licensed Clinician',
      avatarColor: payload.role === 'patient' ? 'teal' : 'indigo',
      passwordHash: payload.password,
      phone: payload.phone,
      specialty: payload.specialty,
      licenseNumber: payload.licenseNumber,
      createdAt: Date.now(),
    };

    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);
    saveAccounts(updatedAccounts);

    const user: UserSession = {
      role: newAccount.role,
      name: newAccount.name,
      title: newAccount.title,
      id: newAccount.id,
      avatarColor: newAccount.avatarColor,
      email: newAccount.email,
      phone: newAccount.phone,
      specialty: newAccount.specialty,
      licenseNumber: newAccount.licenseNumber,
      isDemo: false,
    };

    setCurrentUser(user);
    setCurrentRole(user.role);
    setIsLoggedIn(true);
    setShowLoginModal(false);

    saveSession(user);
    syncDatabaseUser(user);

    return { success: true, user };
  };

  // ----------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------

  const logout = () => {
    clearStoredSession();
    setIsLoggedIn(false);
    setCurrentRole('patient');
    setShowLoginModal(false);
  };

  // ----------------------------------------------------
  // SWITCH ROLE
  // ----------------------------------------------------

  const switchRole = () => {
    loginAs(currentRole === 'patient' ? 'doctor' : 'patient');
  };

  // ----------------------------------------------------
  // CONTEXT VALUE
  // ----------------------------------------------------

  const value: AuthContextValue = {
    currentUser,
    currentRole,
    isLoggedIn,
    authLoading,
    registeredAccounts: accounts,
    loginAs,
    loginWithCredentials,
    registerUser,
    logout,
    switchRole,
    showLoginModal,
    setShowLoginModal,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold">M</span>
          </div>
          <p className="mt-4 text-sm font-bold text-slate-800">Loading MyVita...</p>
          <p className="mt-1 text-xs text-slate-400">Checking your session</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
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
