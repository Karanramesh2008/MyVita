import { useState, useEffect, useCallback } from 'react';

import {
  MapPin,
  Lock,
  Share2,
  AlertTriangle,
  FileText,
  Activity,
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';

import { Navbar } from './components/Navbar';
import { VaultView } from './components/VaultView';
import { ScanModal } from './components/ScanModal';
import { ConsentModal } from './components/ConsentModal';
import { RecipientView } from './components/RecipientView';
import { EmergencyTab } from './components/EmergencyTab';
import { AuditTab } from './components/AuditTab';
import { ConsentsTab } from './components/ConsentsTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { DoctorDashboard } from './components/DoctorDashboard';
import { LoginModal } from './components/LoginModal';
import AuthPage from './components/AuthPage';
import { MyVitaLogo } from './components/MyVitaLogo';
import { NearbyCare } from './components/NearbyCare';

import {
  BPReading,
  ConsentRecord,
} from './types';

import {
  initAndSeedDB,
  getAllReadings,
  getAllConsents,
} from './lib/db';

import {
  syncBus,
  SyncMessage,
} from './lib/sync';

export type ActiveTab =
  | 'vault'
  | 'consents'
  | 'emergency'
  | 'audit'
  | 'analytics'
  | 'nearby';

function MainAppContent() {
  const {
    currentRole,
    showLoginModal,
    setShowLoginModal,
    isLoggedIn,
    authLoading,
  } = useAuth();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('vault');
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthPageOpen, setIsAuthPageOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [shareTargetReading, setShareTargetReading] = useState<BPReading | null>(null);
  const [recipientToken, setRecipientToken] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/view/') || hash.startsWith('#view/')) {
        const token = hash.replace(/^#\/?view\//, '');
        if (token) {
          try {
            setRecipientToken(decodeURIComponent(token));
          } catch {
            setRecipientToken(token);
          }
        }
      } else {
        setRecipientToken(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      await initAndSeedDB();
      const loadedReadings = await getAllReadings();
      setReadings(loadedReadings);
      const loadedConsents = await getAllConsents();
      setConsents(loadedConsents);
    } catch (error) {
      console.error('Failed to load MyVita data:', error);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = syncBus.subscribe((_msg: SyncMessage) => {
      refreshData();
    });
    return () => unsubscribe();
  }, [refreshData]);

  const handleOpenShare = (reading: BPReading) => {
    setShareTargetReading(reading);
    setIsConsentOpen(true);
  };

  const handleConsentCreated = (_newConsent: ConsentRecord) => {
    refreshData();
  };

  const handleSimulateOpenRecipient = (token: string) => {
    setIsConsentOpen(false);
    setRecipientToken(token);
    window.location.hash = `#/view/${encodeURIComponent(token)}`;
  };

  const handleBackToVault = () => {
    setRecipientToken(null);
    window.location.hash = '';
    setActiveTab('audit');
    showToast('Returned to Vault', 'info', 'Check the Audit log to verify access');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <MyVitaLogo size="lg" showText={false} />
          <p className="mt-4 text-sm font-semibold text-slate-700">Loading MyVita...</p>
          <p className="text-xs text-slate-400 mt-1">Checking secure session</p>
        </div>
      </div>
    );
  }

  if (isInitializing && isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="mb-4">
          <MyVitaLogo size="lg" showText={false} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Initializing MyVita...</h2>
        <p className="text-xs text-slate-500 mt-1">Loading private on-device health vault</p>
      </div>
    );
  }

  if (recipientToken) {
    return (
      <RecipientView
        tokenString={recipientToken}
        onBackToVault={handleBackToVault}
      />
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

  if (isAuthPageOpen) {
    return (
      <AuthPage
        initialMode={authMode}
        canCancel={true}
        onCancel={() => setIsAuthPageOpen(false)}
        onSuccess={() => {
          setIsAuthPageOpen(false);
          setIsInitializing(true);
          refreshData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans antialiased">
      <Navbar
        onOpenAuth={(mode) => {
          setAuthMode(mode || 'login');
          setIsAuthPageOpen(true);
        }}
      />

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
        {currentRole === 'doctor' ? (
          <div className="space-y-6">
            <DoctorDashboard onOpenRecipientView={handleSimulateOpenRecipient} />
          </div>
        ) : (
          <div className="space-y-6">
            <nav
              id="patient-tabs-bar"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-full max-w-5xl shadow-sm border border-slate-200"
              aria-label="Vault Sections"
            >
              <button
                id="tab-btn-vault"
                onClick={() => setActiveTab('vault')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'vault' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'}`}
              >
                <Lock className="w-4 h-4 text-teal-600" />
                <span>Vault</span>
                <span className="text-[10px] px-1.5 rounded-full bg-teal-100 text-teal-800 font-mono">{readings.length}</span>
              </button>

              <button
                id="tab-btn-consents"
                onClick={() => setActiveTab('consents')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'consents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'}`}
              >
                <Share2 className="w-4 h-4 text-teal-600" />
                <span>Consents</span>
                {consents.length > 0 && (
                  <span className="text-[10px] px-1.5 rounded-full bg-slate-200 text-slate-700 font-mono">{consents.length}</span>
                )}
              </button>

              <button
                id="tab-btn-emergency"
                onClick={() => setActiveTab('emergency')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'emergency' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'}`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Emergency</span>
              </button>

              <button
                id="tab-btn-nearby"
                onClick={() => setActiveTab('nearby')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'nearby' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'}`}
              >
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Nearby</span>
              </button>

              <button
                id="tab-btn-audit"
                onClick={() => setActiveTab('audit')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'}`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Audit</span>
              </button>

              <button
                id="tab-btn-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'}`}
              >
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Analytics</span>
              </button>
            </nav>

            {activeTab === 'vault' && (
              <VaultView
                readings={readings}
                onOpenScan={() => setIsScanOpen(true)}
                onOpenShare={handleOpenShare}
                onRefresh={refreshData}
              />
            )}

            {activeTab === 'consents' && (
              <ConsentsTab
                onOpenCreateConsent={() => {
                  setShareTargetReading(readings[0] || null);
                  setIsConsentOpen(true);
                }}
                onSimulateOpenRecipient={handleSimulateOpenRecipient}
              />
            )}

            {activeTab === 'emergency' && <EmergencyTab />}
            {activeTab === 'nearby' && <NearbyCare />}
            {activeTab === 'audit' && <AuditTab />}
            {activeTab === 'analytics' && <AnalyticsTab readings={readings} consents={consents} />}
          </div>
        )}
      </div>

      {currentRole === 'patient' && (
        <nav
          id="mobile-bottom-tabs"
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg"
          aria-label="Mobile Navigation"
        >
          <button onClick={() => setActiveTab('vault')} className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'vault' ? 'text-teal-700' : 'text-slate-500'}`}>
            <Lock className="w-4 h-4" />
            <span>Vault</span>
          </button>
          <button onClick={() => setActiveTab('consents')} className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'consents' ? 'text-teal-700' : 'text-slate-500'}`}>
            <Share2 className="w-4 h-4" />
            <span>Consents</span>
          </button>
          <button onClick={() => setActiveTab('emergency')} className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'emergency' ? 'text-rose-600' : 'text-slate-500'}`}>
            <AlertTriangle className="w-4 h-4" />
            <span>Emergency</span>
          </button>
          <button onClick={() => setActiveTab('nearby')} className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'nearby' ? 'text-indigo-600' : 'text-slate-500'}`}>
            <MapPin className="w-4 h-4" />
            <span>Nearby</span>
          </button>
          <button onClick={() => setActiveTab('audit')} className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'audit' ? 'text-emerald-600' : 'text-slate-500'}`}>
            <FileText className="w-4 h-4" />
            <span>Audit</span>
          </button>
        </nav>
      )}

      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSaved={refreshData}
      />

      <ConsentModal
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        targetReading={shareTargetReading}
        allReadings={readings}
        onConsentCreated={handleConsentCreated}
        onSimulateOpenRecipient={handleSimulateOpenRecipient}
      />

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
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
