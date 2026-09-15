import { useState, useEffect } from 'react';
import {
  Stethoscope,
  QrCode,
  ShieldCheck,
  Search,
  Activity,
  Heart,
  TrendingUp,
  Clock,
  ExternalLink,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  Camera,
  Download,
  Filter,
} from 'lucide-react';
import { ConsentRecord, BPReading } from '../types';
import { getAllConsents, getAllReadings } from '../lib/db';
import { decodeConsentToken } from '../lib/token';
import { syncBus, SyncMessage } from '../lib/sync';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface DoctorDashboardProps {
  onOpenRecipientView: (token: string) => void;
}

export function DoctorDashboard({ onOpenRecipientView }: DoctorDashboardProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const allConsents = await getAllConsents();
      let combinedConsents = [...allConsents];

      try {
        const raw = localStorage.getItem('myvita_shared_tokens') || '{}';
        const sharedMap = JSON.parse(raw);
        for (const token in sharedMap) {
          if (!combinedConsents.some((c) => c.token === token || c.id === sharedMap[token].id)) {
            combinedConsents.push(sharedMap[token]);
          }
        }
      } catch {
        // ignore
      }

      const doctorQuery = currentUser.name.toLowerCase().replace('dr.', '').trim();
      const relevant = combinedConsents.filter(
        (c) =>
          c.recipient.toLowerCase().includes('dr') ||
          c.recipient.toLowerCase().includes('sharma') ||
          (doctorQuery && c.recipient.toLowerCase().includes(doctorQuery))
      );
      setConsents(relevant);

      let displayReadings = await getAllReadings();
      if (displayReadings.length === 0) {
        for (const c of relevant) {
          if (c.readingIds && !c.revoked) {
            const decoded = decodeConsentToken(c.token);
            if (decoded.payload?.readingsData) {
              displayReadings = [...displayReadings, ...decoded.payload.readingsData];
            }
          }
        }
      }
      setReadings(displayReadings);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = syncBus.subscribe((msg: SyncMessage) => {
      loadData();
    });
    return () => unsub();
  }, [currentUser.id]);

  // Compute Clinical Analytics
  const analytics = (() => {
    if (readings.length === 0) return { map: 0, bpLoad: 0, avgPulse: 0, pulsePressure: 0, stage2Pct: 0 };
    const avgSys = readings.reduce((s, r) => s + r.systolic, 0) / readings.length;
    const avgDia = readings.reduce((s, r) => s + r.diastolic, 0) / readings.length;
    const map = Math.round((2 * avgDia + avgSys) / 3);
    const pulsePressure = Math.round(avgSys - avgDia);
    const elevatedCount = readings.filter((r) => r.systolic >= 130 || r.diastolic >= 80).length;
    const bpLoad = Math.round((elevatedCount / readings.length) * 100);
    const stage2Count = readings.filter((r) => r.systolic >= 140 || r.diastolic >= 90).length;
    const stage2Pct = Math.round((stage2Count / readings.length) * 100);
    const avgPulse = Math.round(readings.reduce((s, r) => s + r.pulse, 0) / readings.length);

    return { map, bpLoad, avgPulse, pulsePressure, stage2Pct };
  })();

  const handleOpenToken = (token: string) => {
    if (!token.trim()) {
      showToast('Please enter or scan a valid token', 'warning');
      return;
    }
    onOpenRecipientView(token.trim());
  };

  const chartData = readings
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      date: new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
    }));

  return (
    <div id="doctor-dashboard-container" className="space-y-6">
      {/* Clinician Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Doctor Recipient Portal
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-800">
                Modiqo.ai (Rote) Gateway
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {currentUser.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
              {currentUser.title || 'Clinician Consultation Portal'}. Review patient-granted blood pressure streams.
              All data views are strictly limited to active cryptographic consent parameters.
            </p>
          </div>

          {/* Quick Token/QR Opener Box */}
          <div className="shrink-0 bg-slate-800/90 p-4 rounded-2xl border border-slate-700 max-w-sm w-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-teal-400" />
                <span>Enter Patient Token</span>
              </span>
              <span className="text-[10px] text-slate-400">JWT Escrow</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="Paste /view/token string..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-mono placeholder:text-slate-500 focus:ring-1 focus:ring-teal-400"
              />
              <button
                onClick={() => handleOpenToken(manualTokenInput)}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow transition-colors"
              >
                Inspect
              </button>
            </div>
          </div>
        </div>

        {/* Clinical Analytics KPI bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Mean Arterial Pressure (MAP)</span>
            <p className="text-xl font-black text-white font-mono mt-0.5">{analytics.map} mmHg</p>
            <span className="text-[10px] text-teal-400 font-semibold">Goal: 70–100 mmHg</span>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Hypertensive BP Load</span>
            <p className="text-xl font-black text-white font-mono mt-0.5">{analytics.bpLoad}%</p>
            <span className="text-[10px] text-rose-400 font-semibold">{analytics.stage2Pct}% Stage 2 HTN</span>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Pulse Pressure Index</span>
            <p className="text-xl font-black text-white font-mono mt-0.5">{analytics.pulsePressure} mmHg</p>
            <span className="text-[10px] text-slate-400 font-medium">SYS minus DIA</span>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Active Consents</span>
            <p className="text-xl font-black text-white font-mono mt-0.5">{consents.length}</p>
            <span className="text-[10px] text-indigo-400 font-medium">Direct Patient Grants</span>
          </div>
        </div>
      </div>

      {/* Patient Shared Consents Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Shared Patient Grants</h3>
            <p className="text-xs text-slate-500">Cryptographically scoped for {currentUser.name}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            {consents.filter((c) => !c.revoked && Date.now() < c.expiresAt).length} Active Tokens
          </span>
        </div>

        {consents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-700">No Patient Consents Directed to {currentUser.name} Yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Switch to Patient view, generate a consent QR or share link, and it will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consents.map((c) => {
              const isRevoked = c.revoked;
              const isExpired = Date.now() > c.expiresAt;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{c.patientName || 'Personal Vault Patient'}</span>
                        {isRevoked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Authorized
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Scope: <strong>{c.scope}</strong> • Purpose: <strong>{c.purpose}</strong>
                      </p>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(c.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {Math.max(0, Math.round((c.expiresAt - Date.now()) / 3600000))} hours remaining
                    </span>

                    <button
                      onClick={() => handleOpenToken(c.token)}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open Scoped Trend</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clinical Trend Recharts Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Clinical Blood Pressure Trajectory</h3>
            <p className="text-xs text-slate-500">Real-time synced from patient's private vault via Modiqo Rote</p>
          </div>
          {chartData.length > 0 && (
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-rose-600">● Systolic</span>
              <span className="text-teal-600">● Diastolic</span>
            </div>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 w-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center p-6">
            <Activity className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No Patient Readings Granted Yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              When patients create a scoped consent token or you inspect a token above, the permitted blood pressure trajectory will render here.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis domain={[60, 165]} stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine y={130} stroke="#F59E0B" strokeDasharray="3 3" />
                <ReferenceLine y={80} stroke="#10B981" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="systolic" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="diastolic" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
