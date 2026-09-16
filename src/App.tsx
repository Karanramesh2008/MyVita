import { useState, useEffect } from 'react';
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
import { BPReading, ConsentRecord } from './types';
import { initAndSeedDB, getAllReadings, getAllConsents } from './lib/db';
import { syncBus, SyncMessage } from './lib/sync';
import {
  Lock,
  Share2,
  AlertTriangle,
  FileText,
  Activity,
} from 'lucide-react';

export type ActiveTab = 'vault' | 'consents' | 'emergency' | 'audit' | 'analytics';

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
  const [isInitializing, setIsInitializing] = useState(false);

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
          setRecipientToken(decodeURIComponent(token));
        }
      } else if (!hash) {
        setRecipientToken(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const refreshData = async () => {
    if (!isLoggedIn) return;

    setIsInitializing(true);

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
  };

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      refreshData();
    }
  }, [authLoading, isLoggedIn]);

  useEffect(() => {
    const unsub = syncBus.subscribe((msg: SyncMessage) => {
      if (isLoggedIn) {
        refreshData();
      }
    });

    return () => unsub();
  }, [isLoggedIn]);

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
    showToast('Returned to Vault', 'info', 'Check the Audit log to verify Dr. Sharma access');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="mb-4">
          <MyVitaLogo size="lg" showText={false} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Checking MyVita session...</h2>
        <p className="text-xs text-slate-500 mt-1">Restoring your secure session</p>
      </div>
    );
  }

  if (recipientToken) {
    return <RecipientView tokenString={recipientToken} onBackToVault={handleBackToVault} />;
  }

  if (!isLoggedIn) {
    return (
      <AuthPage
        initialMode="login"
        onSuccess={() => {
          // AuthContext updates isLoggedIn; the effect above loads vault data.
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
          refreshData();
        }}
      />
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="mb-4">
          <MyVitaLogo size="lg" showText={false} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Initializing MyVita...</h2>
        <p className="text-xs text-slate-500 mt-1">Loading your private on-device health vault</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
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
              className="flex items-center gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl max-w-xl shadow-xs overflow-x-auto border border-slate-200/60"
              aria-label="Vault Sections"
            >
              <button
                id="tab-btn-vault"
                onClick={() => setActiveTab('vault')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'vault'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Lock className="w-4 h-4 text-teal-600" />
                <span>Vault</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-mono">
                  {readings.length}
                </span>
              </button>

              <button
                id="tab-btn-consents"
                onClick={() => setActiveTab('consents')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'consents'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Share2 className="w-4 h-4 text-teal-600" />
                <span>Consents</span>
                {consents.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
                    {consents.length}
                  </span>
                )}
              </button>

              <button
                id="tab-btn-emergency"
                onClick={() => setActiveTab('emergency')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'emergency'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Emergency</span>
              </button>

              <button
                id="tab-btn-audit"
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'audit'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Audit</span>
              </button>

              <button
                id="tab-btn-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
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
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'vault' ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <Lock className="w-4 h-4" />
            <span>Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('consents')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'consents' ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <Share2 className="w-4 h-4" />
            <span>Consents</span>
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'emergency' ? 'text-rose-600' : 'text-slate-400'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Emergency</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${activeTab === 'audit' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
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
