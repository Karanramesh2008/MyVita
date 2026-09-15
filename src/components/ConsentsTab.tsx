import { useState, useEffect } from 'react';
import { ConsentRecord } from '../types';
import { getAllConsents, revokeConsent } from '../lib/db';
import { syncBus, SyncMessage } from '../lib/sync';
import { QRCodeSVG } from 'qrcode.react';
import {
  Share2,
  Lock,
  Clock,
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ConsentsTabProps {
  onOpenCreateConsent: () => void;
  onSimulateOpenRecipient: (token: string) => void;
}

export function ConsentsTab({ onOpenCreateConsent, onSimulateOpenRecipient }: ConsentsTabProps) {
  const { showToast } = useToast();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);

  const loadConsents = async () => {
    try {
      const list = await getAllConsents();
      setConsents(list);
      if (list.length > 0 && !selectedConsent) {
        setSelectedConsent(list[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConsents();
    const unsub = syncBus.subscribe((msg: SyncMessage) => {
      if (msg.type === 'CONSENT_CREATED' || msg.type === 'CONSENT_REVOKED' || msg.type === 'DEMO_RESET') {
        loadConsents();
      }
    });
    return () => unsub();
  }, []);

  const handleRevoke = async (id: string) => {
    if (confirm('Revoke this consent immediately? The recipient will be blocked from accessing this data.')) {
      try {
        await revokeConsent(id);
        showToast('Consent revoked', 'warning', 'Recipient token invalidated');
        loadConsents();
      } catch {
        showToast('Error revoking consent', 'error');
      }
    }
  };

  const getRecipientUrl = (token: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/view/${encodeURIComponent(token)}`;
  };

  const handleCopy = async (token: string) => {
    const url = getRecipientUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied to clipboard', 'info');
    } catch {
      showToast('Share link ready', 'info', url);
    }
  };

  return (
    <div id="consents-tab-container" className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Consents & QR Tokens</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800">
              Zero Raw Data Leaks
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            You don't send copies of health records. You create scoped, time-boxed cryptographic authorizations.
            Every token can be inspected or revoked with 1 click.
          </p>
        </div>

        <button
          id="new-consent-btn"
          onClick={onOpenCreateConsent}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Share2 className="w-4 h-4" />
          <span>New Consent Scope</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Loading active consents...</p>
        </div>
      ) : consents.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">No Active Consents</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your data stays private in your local vault. When you want to share with Dr. Sharma or another specialist,
            tap "New Consent Scope" or tap "Share" on any BP reading.
          </p>
          <button
            onClick={onOpenCreateConsent}
            className="mt-2 px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
          >
            Create First Consent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List of Consents */}
          <div className="lg:col-span-7 space-y-3">
            {consents.map((c) => {
              const isExpired = Date.now() > c.expiresAt;
              const isRevoked = c.revoked;
              const isSelected = selectedConsent?.id === c.id;

              return (
                <div
                  key={c.id}
                  id={`consent-card-${c.id}`}
                  onClick={() => setSelectedConsent(c)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer bg-white ${
                    isSelected ? 'border-teal-500 shadow-md ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{c.recipient}</h4>
                        {isRevoked ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Purpose: <strong>{c.purpose}</strong> • Scope: <strong>{c.scope}</strong>
                      </p>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      {Math.max(0, Math.round((c.expiresAt - Date.now()) / (1000 * 3600)))}h left
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isRevoked && !isExpired && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevoke(c.id);
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSimulateOpenRecipient(c.token);
                        }}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1"
                      >
                        <span>Open View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* QR & Token Details Inspector */}
          <div className="lg:col-span-5">
            {selectedConsent ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-900">QR Token Inspector</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Modiqo Rote Token</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                  <div className="p-3 bg-white rounded-xl shadow-xs">
                    <QRCodeSVG
                      value={getRecipientUrl(selectedConsent.token)}
                      size={180}
                      level="M"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 mt-2">
                    {selectedConsent.recipient} • {selectedConsent.scope}
                  </p>
                  <p className="text-[10px] text-slate-400">Time-boxed cryptographically</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => onSimulateOpenRecipient(selectedConsent.token)}
                    className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Simulate Recipient Scan (Doctor View)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCopy(selectedConsent.token)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Copy Scoped Share Link
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
