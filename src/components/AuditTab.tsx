import { useState, useEffect } from 'react';
import { AuditEvent } from '../types';
import { getAllAuditEvents } from '../lib/db';
import { syncBus, SyncMessage } from '../lib/sync';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Clock,
  ArrowUpRight,
  Filter,
  RefreshCw,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export function AuditTab() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadAuditData = async () => {
    try {
      const list = await getAllAuditEvents();
      setEvents(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();

    // Subscribe to real-time sync bus for instant updates when recipient view is opened in another tab!
    const unsubscribe = syncBus.subscribe((msg: SyncMessage) => {
      if (
        msg.type === 'CONSENT_ACCESSED' ||
        msg.type === 'CONSENT_CREATED' ||
        msg.type === 'CONSENT_REVOKED' ||
        msg.type === 'DEMO_RESET'
      ) {
        loadAuditData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.id]);

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'ALL') return true;
    return ev.type === filterType;
  });

  // Helper for colored dots: blue = consent created, green = access, red = revoked
  const getEventBadge = (type: AuditEvent['type']) => {
    switch (type) {
      case 'CONSENT_CREATED':
        return {
          dotColor: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          label: 'Consent Created',
        };
      case 'CONSENT_ACCESSED':
        return {
          dotColor: 'bg-emerald-500',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          label: 'Data Accessed',
        };
      case 'CONSENT_REVOKED':
        return {
          dotColor: 'bg-rose-500',
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-700',
          borderColor: 'border-rose-200',
          label: 'Access Revoked',
        };
      case 'EMERGENCY_ACCESSED':
        return {
          dotColor: 'bg-amber-500',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          label: 'Emergency Access',
        };
      default:
        return {
          dotColor: 'bg-slate-400',
          bgColor: 'bg-slate-50',
          textColor: 'text-slate-700',
          borderColor: 'border-slate-200',
          label: type,
        };
    }
  };

  return (
    <div id="audit-tab-container" className="space-y-6">
      {/* Header with Exact Copy specified in Prompt: "Every access, recorded. Nothing hidden." */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Audit Trail & Access Log</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Live Immutable Ledger
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 mt-1 italic">
            "Every access, recorded. Nothing hidden."
          </p>
          <p className="text-xs text-slate-500 max-w-xl">
            Whenever a doctor, caregiver, or paramedic scans or requests your data, a verifiable event is
            stored locally in your tamper-evident ledger via Modiqo.ai (Rote).
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto overflow-x-auto">
          {['ALL', 'CONSENT_ACCESSED', 'CONSENT_CREATED', 'CONSENT_REVOKED'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === t
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'ALL'
                ? 'All Events'
                : t === 'CONSENT_ACCESSED'
                ? 'Accesses (Green)'
                : t === 'CONSENT_CREATED'
                ? 'Created (Blue)'
                : 'Revoked (Red)'}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Events List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Recorded Audit Events</span>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
              {filteredEvents.length}
            </span>
          </div>

          <button
            onClick={loadAuditData}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading ledger events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No events found in this view</p>
            <p className="text-xs text-slate-400 mt-1">Actions performed on your vault appear here immediately.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.map((item) => {
              const badge = getEventBadge(item.type);
              const date = new Date(item.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div
                  key={item.id}
                  id={`audit-row-${item.id}`}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Colored Status Dot as specified: blue = consent created, green = access, red = revoked */}
                    <div className="mt-1 sm:mt-0 relative flex items-center justify-center">
                      <span className={`w-3.5 h-3.5 rounded-full ${badge.dotColor} shrink-0 ring-4 ring-slate-100`}></span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{item.recipient}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                        >
                          {badge.label}
                        </span>
                        {item.scope && (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Scope: {item.scope}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {item.details || `${item.recipient} accessed records under permission`}
                      </p>
                    </div>
                  </div>

                  {/* Timestamp & Verification */}
                  <div className="sm:text-right shrink-0 pl-7 sm:pl-0">
                    <div className="flex items-center sm:justify-end gap-1 text-xs font-bold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{timeStr}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
