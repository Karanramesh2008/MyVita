import { useState, useEffect, useCallback } from 'react';

import {
  Activity,
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';

import { Navbar } from './components/Navbar';
import { VaultView } from './components/VaultView';
import { RecipientView } from './components/RecipientView';
import { EmergencyTab } from './components/EmergencyTab';
import { AuditTab } from './components/AuditTab';
import { ConsentsTab } from './components/ConsentsTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { DoctorDashboard } from './components/DoctorDashboard';
import AuthPage from './components/AuthPage';
import { NearbyCare } from './components/NearbyCare';

import {
  BPReading,
  ConsentRecord,
} from './types';

import {
  getAllReadings,
  getAllConsents,
  getAllAuditEvents,
} from './lib/db';

function MainAppContent() {
  const { currentUser, currentRole, isLoggedIn, authLoading, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('vault');
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [recipientToken, setRecipientToken] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [r, c, a] = await Promise.all([
        getAllReadings(),
        getAllConsents(),
        getAllAuditEvents(),
      ]);
      setReadings(r);
      setConsents(c);
      setAuditEntries(a);
    } catch (error) {
      console.error('Failed to load MyVita data:', error);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#\/view\/(.+)$/);
    setRecipientToken(match ? match[1] : null);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
    } else {
      setIsInitializing(false);
    }
  }, [isLoggedIn, refreshData]);

  if (recipientToken) {
    return <RecipientView tokenString={recipientToken} onBackToVault={() => {
      setRecipientToken(null);
      window.location.hash = '';
      setActiveTab('audit');
      showToast('Returned to Vault', 'info', 'Check the Audit log to verify access');
    }} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto">
            <Activity size={24} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-600">Loading MyVita...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <AuthPage
        initialMode="login"
        onSuccess={() => {
          setIsInitializing(true);
          refreshData();
        }}
      />
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-600">Initializing MyVita...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'doctor' ? (
          <DoctorDashboard readings={readings} />
        ) : (
          <>
            {activeTab === 'vault' && (
              <VaultView readings={readings} onRefresh={refreshData} />
            )}
            {activeTab === 'nearby' && <NearbyCare />}
            {activeTab === 'emergency' && <EmergencyTab />}
            {activeTab === 'consents' && (
              <ConsentsTab consents={consents} onRefresh={refreshData} />
            )}
            {activeTab === 'analytics' && <AnalyticsTab readings={readings} />}
            {activeTab === 'audit' && <AuditTab entries={auditEntries} />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
