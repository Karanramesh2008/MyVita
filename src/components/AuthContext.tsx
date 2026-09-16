import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  UserRole,
  UserSession,
  AuthAccount,
} from '../types';

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
  phone: undefined,
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
    createdAt: Date.now(),
  },

  {
    ...DOCTOR_USER,
    passwordHash: 'doctor123',
    createdAt: Date.now(),
  },
];

// ======================================================
// TYPES
// ======================================================

export interface RegisterPayload {
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
  currentUser: UserSession | null;

  currentRole: UserRole;

  isLoggedIn: boolean;

  authLoading: boolean;

  registeredAccounts: AuthAccount[];

  showLoginModal: boolean;

  setShowLoginModal: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  loginWithCredentials: (
    email: string,
    password: string
  ) => AuthResult;

  loginAs: (
    role: UserRole
  ) => void;

  registerUser: (
    payload: RegisterPayload
  ) => AuthResult;

  logout: () => void;

  setRole: (
    role: UserRole
  ) => void;
}

// ======================================================
// CONTEXT
// ======================================================

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

// ======================================================
// LOAD ACCOUNTS
// ======================================================

function loadAccounts(): AuthAccount[] {
  try {
    const saved =
      localStorage.getItem(ACCOUNTS_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(
      'Failed to load MyVita accounts:',
      error
    );
  }

  // First installation:
  // Create demo accounts.
  //
  // IMPORTANT:
  // We DO NOT log the user in here.

  localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(DEFAULT_ACCOUNTS)
  );

  return DEFAULT_ACCOUNTS;
}

// ======================================================
// SAVE ACCOUNTS
// ======================================================

function saveAccounts(
  accounts: AuthAccount[]
) {
  localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(accounts)
  );
}

// ======================================================
// AUTH PROVIDER
// ======================================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  // ----------------------------------------------------
  // STATE
  // ----------------------------------------------------

  const [
    currentUser,
    setCurrentUser,
  ] = useState<UserSession | null>(null);

  const [
    currentRole,
    setCurrentRole,
  ] = useState<UserRole>('patient');

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    registeredAccounts,
    setRegisteredAccounts,
  ] = useState<AuthAccount[]>([]);

  const [
    showLoginModal,
    setShowLoginModal,
  ] = useState(false);

  // ----------------------------------------------------
  // CLEAR SESSION
  // ----------------------------------------------------

  const clearSession = () => {
    localStorage.removeItem(
      CURRENT_USER_KEY
    );

    localStorage.removeItem(
      ACTIVE_ROLE_KEY
    );

    localStorage.removeItem(
      LOGGED_IN_KEY
    );

    setCurrentUser(null);
    setCurrentRole('patient');
    setIsLoggedIn(false);
  };

  // ----------------------------------------------------
  // RESTORE SESSION
  // ----------------------------------------------------

  useEffect(() => {
    const accounts = loadAccounts();

    setRegisteredAccounts(accounts);

    try {
      const loggedIn =
        localStorage.getItem(
          LOGGED_IN_KEY
        ) === 'true';

      const savedUser =
        localStorage.getItem(
          CURRENT_USER_KEY
        );

      const savedRole =
        localStorage.getItem(
          ACTIVE_ROLE_KEY
        ) as UserRole | null;

      // ------------------------------------------------
      // NO SESSION
      // ------------------------------------------------

      if (!loggedIn || !savedUser) {
        setCurrentUser(null);
        setCurrentRole('patient');
        setIsLoggedIn(false);
        return;
      }

      // ------------------------------------------------
      // RESTORE USER
      // ------------------------------------------------

      const parsedUser =
        JSON.parse(savedUser) as UserSession;

      // Make sure account still exists.

      const accountExists =
        accounts.some(
          (account) =>
            account.email.toLowerCase() ===
            parsedUser.email.toLowerCase()
        );

      if (!accountExists) {
        clearSession();
        return;
      }

      // ------------------------------------------------
      // RESTORE SESSION
      // ------------------------------------------------

      setCurrentUser(parsedUser);

      setCurrentRole(
        savedRole || parsedUser.role
      );

      setIsLoggedIn(true);

    } catch (error) {
      console.error(
        'Failed to restore MyVita session:',
        error
      );

      clearSession();

    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ----------------------------------------------------
  // LOGIN WITH EMAIL + PASSWORD
  // ----------------------------------------------------

  const loginWithCredentials = (
    email: string,
    password: string
  ): AuthResult => {

    const normalizedEmail =
      email.trim().toLowerCase();

    const account =
      registeredAccounts.find(
        (item) =>
          item.email.toLowerCase() ===
          normalizedEmail
      );

    if (!account) {
      return {
        success: false,
        message:
          'No account found with this email.',
      };
    }

    if (
      account.passwordHash !==
      password
    ) {
      return {
        success: false,
        message:
          'Incorrect password.',
      };
    }

    const user: UserSession = {
      role: account.role,

      name: account.name,

      title: account.title,

      id: account.id,

      avatarColor:
        account.avatarColor,

      email: account.email,

      phone:
        account.phone,

      specialty:
        account.specialty,

      licenseNumber:
        account.licenseNumber,

      isDemo:
        account.isDemo,
    };

    // ------------------------------------------------
    // SAVE SESSION
    // ------------------------------------------------

    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(user)
    );

    localStorage.setItem(
      ACTIVE_ROLE_KEY,
      account.role
    );

    localStorage.setItem(
      LOGGED_IN_KEY,
      'true'
    );

    // ------------------------------------------------
    // UPDATE REACT STATE
    // ------------------------------------------------

    setCurrentUser(user);

    setCurrentRole(
      account.role
    );

    setIsLoggedIn(true);

    setShowLoginModal(false);

    return {
      success: true,
      user,
    };
  };

  // ----------------------------------------------------
  // QUICK DEMO LOGIN
  // ----------------------------------------------------

  const loginAs = (
    role: UserRole
  ) => {

    const demoUser =
      role === 'patient'
        ? PATIENT_USER
        : DOCTOR_USER;

    let accounts =
      [...registeredAccounts];

    const exists =
      accounts.some(
        (account) =>
          account.email.toLowerCase() ===
          demoUser.email.toLowerCase()
      );

    if (!exists) {

      const demoAccount: AuthAccount = {
        ...demoUser,

        passwordHash:
          role === 'patient'
            ? 'demo123'
            : 'doctor123',

        createdAt:
          Date.now(),
      };

      accounts = [
        ...accounts,
        demoAccount,
      ];

      setRegisteredAccounts(
        accounts
      );

      saveAccounts(
        accounts
      );
    }

    // ------------------------------------------------
    // SAVE SESSION
    // ------------------------------------------------

    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(demoUser)
    );

    localStorage.setItem(
      ACTIVE_ROLE_KEY,
      role
    );

    localStorage.setItem(
      LOGGED_IN_KEY,
      'true'
    );

    // ------------------------------------------------
    // UPDATE STATE
    // ------------------------------------------------

    setCurrentUser(demoUser);

    setCurrentRole(role);

    setIsLoggedIn(true);

    setShowLoginModal(false);
  };

  // ----------------------------------------------------
  // REGISTER NEW USER
  // ----------------------------------------------------

  const registerUser = (
    payload: RegisterPayload
  ): AuthResult => {

    const email =
      payload.email
        .trim()
        .toLowerCase();

    // ------------------------------------------------
    // CHECK DUPLICATE EMAIL
    // ------------------------------------------------

    const existing =
      registeredAccounts.find(
        (account) =>
          account.email.toLowerCase() ===
          email
      );

    if (existing) {
      return {
        success: false,
        message:
          'An account with this email already exists.',
      };
    }

    // ------------------------------------------------
    // GENERATE USER ID
    // ------------------------------------------------

    const prefix =
      payload.role === 'patient'
        ? 'MV-PT-'
        : 'MV-DR-';

    const userId =
      prefix +
      Math.floor(
        1000 +
        Math.random() * 9000
      );

    // ------------------------------------------------
    // CREATE ACCOUNT
    // ------------------------------------------------

    const newAccount: AuthAccount = {

      role:
        payload.role,

      name:
        payload.name.trim(),

      title:
        payload.role === 'patient'
          ? 'Patient (Personal Vault)'
          : 'Clinician / Doctor',

      id:
        userId,

      avatarColor:
        payload.role === 'patient'
          ? 'teal'
          : 'indigo',

      email:

        email,

      phone:
        payload.phone,

      specialty:
        payload.specialty,

      licenseNumber:
        payload.licenseNumber,

      passwordHash:
        payload.password,

      createdAt:
        Date.now(),

      isDemo:
        false,
    };

    // ------------------------------------------------
    // SAVE ACCOUNT
    // ------------------------------------------------

    const updatedAccounts = [
      ...registeredAccounts,
      newAccount,
    ];

    setRegisteredAccounts(
      updatedAccounts
    );

    saveAccounts(
      updatedAccounts
    );

    // ------------------------------------------------
    // CREATE SESSION
    // ------------------------------------------------

    const user: UserSession = {

      role:
        newAccount.role,

      name:
        newAccount.name,

      title:
        newAccount.title,

      id:
        newAccount.id,

      avatarColor:
        newAccount.avatarColor,

      email:
        newAccount.email,

      phone:
        newAccount.phone,

      specialty:
        newAccount.specialty,

      licenseNumber:
        newAccount.licenseNumber,

      isDemo:
        false,
    };

    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(user)
    );

    localStorage.setItem(
      ACTIVE_ROLE_KEY,
      user.role
    );

    localStorage.setItem(
      LOGGED_IN_KEY,
      'true'
    );

    setCurrentUser(user);

    setCurrentRole(
      user.role
    );

    setIsLoggedIn(true);

    setShowLoginModal(false);

    return {
      success: true,
      user,
    };
  };

  // ----------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------

  const logout = () => {
    clearSession();
    setShowLoginModal(false);
  };

  // ----------------------------------------------------
  // ROLE
  // ----------------------------------------------------

  const setRole = (
    role: UserRole
  ) => {

    if (!currentUser) {
      return;
    }

    // Only allow the user's actual role.

    if (
      currentUser.role !==
      role
    ) {
      return;
    }

    setCurrentRole(role);

    localStorage.setItem(
      ACTIVE_ROLE_KEY,
      role
    );
  };

  // ----------------------------------------------------
  // CONTEXT VALUE
  // ----------------------------------------------------

  const value: AuthContextValue = {

    currentUser,

    currentRole,

    isLoggedIn,

    authLoading,

    registeredAccounts,

    showLoginModal,

    setShowLoginModal,

    loginWithCredentials,

    loginAs,

    registerUser,

    logout,

    setRole,
  };

  // ----------------------------------------------------
  // AUTH INITIALIZATION SCREEN
  // ----------------------------------------------------

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">

          <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold">
              M
            </span>
          </div>

          <p className="mt-4 text-sm font-bold text-slate-800">
            Loading MyVita...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Checking your session
          </p>

        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PROVIDER
  // ----------------------------------------------------

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ======================================================
// useAuth HOOK
// ======================================================

export function useAuth() {

  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}