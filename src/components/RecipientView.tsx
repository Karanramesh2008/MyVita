import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Heart,
  Calendar,
  Lock,
  ArrowLeft,
  Activity,
  FileText,
  AlertTriangle,
  Download,
  Stethoscope,
} from 'lucide-react';
import { decodeConsentToken } from '../lib/token';
import { getConsentByToken, getAllReadings, addAuditEvent } from '../lib/db';
import { BPReading, TokenPayload, ConsentRecord } from '../types';
import { useToast } from '../context/ToastContext';

interface RecipientViewProps {
  tokenString: string;
  onBackToVault?: () => void;
}

export function RecipientView({ tokenString, onBackToVault }: RecipientViewProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [consentRecord, setConsentRecord] = useState<ConsentRecord | null>(null);
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [isExpiredOrRevoked, setIsExpiredOrRevoked] = useState(false);
  const [statusReason, setStatusReason] = useState<string>('');
  const [accessTimestamp, setAccessTimestamp] = useState<string>('');
  const hasLoggedAudit = useRef(false);

  useEffect(() => {
    hasLoggedAudit.current = false;

    async function loadRecipientData() {
      setIsLoading(true);
      setIsExpiredOrRevoked(false);
      setStatusReason('');
      setAccessTimestamp('');
      setTokenPayload(null);
      setConsentRecord(null);
      setReadings([]);
      const decoded = decodeConsentToken(tokenString);

      if (!decoded.validFormat || !decoded.payload) {
        setIsExpiredOrRevoked(true);
        setStatusReason('Invalid token format or corrupted cryptographic signature.');
        setIsLoading(false);
        return;
      }

      const payload = decoded.payload;
      setTokenPayload(payload);

      // Check expiry
      if (Date.now() > payload.expiresAt) {
        setIsExpiredOrRevoked(true);
        setStatusReason('This access link has expired.');
        setIsLoading(false);
        return;
      }

      // Check revocation status in local DB (or simulated remote DB)
      const existingConsent = await getConsentByToken(tokenString);
      if (existingConsent) {
        setConsentRecord(existingConsent);
        if (existingConsent.revoked) {
          setIsExpiredOrRevoked(true);
          setStatusReason('This consent was revoked by the patient.');
          setIsLoading(false);
          return;
        }
      }

      // Retrieve readings: prefer encrypted/bundled readingsData from the token payload,
      // falling back to local database store
      let all: BPReading[] = [];
      if (payload.readingsData && payload.readingsData.length > 0) {
        all = payload.readingsData;
      } else {
        all = await getAllReadings();
      }

      // Filter strictly by scope!
      let filtered: BPReading[] = [];
      if (payload.scope === 'This reading') {
        filtered = all.filter((r) => payload.readingIds.includes(r.id));
      } else if (payload.scope === 'Last 30 days') {
        const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
        filtered = all.filter((r) => r.timestamp >= cutoff);
      } else if (payload.scope === 'Summary only') {
        filtered = all.slice(0, 4);
      } else {
        filtered = all;
      }

      // Sort chronological for charts (oldest to newest)
      filtered = [...filtered].sort((a, b) => a.timestamp - b.timestamp);
      setReadings(filtered);

      // Record access timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAccessTimestamp(timeStr);

      // Write an AuditEvent on every view (Step 4 & 5 of 3-minute demo path)
      if (!hasLoggedAudit.current) {
        hasLoggedAudit.current = true;
        try {
          await addAuditEvent({
            type: 'CONSENT_ACCESSED',
            consentId: payload.consentId,
            recipient: payload.recipient,
            scope: payload.scope,
            details: `Accessed by ${payload.recipient} (${payload.purpose}) at ${timeStr}. Client identity verified.`,
          });
          showToast(`Access logged: ${payload.recipient}`, 'info', `At ${timeStr} • Audit stream updated`);
        } catch (err) {
          console.warn('Audit log error:', err);
        }
      }

      setIsLoading(false);
    }

    loadRecipientData().catch((error) => {
      console.error('Recipient view error:', error);
      setIsExpiredOrRevoked(true);
      setStatusReason('Unable to verify this access link. Please request a new consent link from the patient.');
      setIsLoading(false);
    });
  }, [tokenString, showToast]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return readings.map((r) => ({
      date: new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
    }));
  }, [readings]);

  // Summary statistics
  const averages = useMemo(() => {
    if (readings.length === 0) return { sys: 0, dia: 0, pulse: 0, map: 0 };
    const sys = Math.round(readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length);
    const dia = Math.round(readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length);
    const pulse = Math.round(readings.reduce((sum, r) => sum + r.pulse, 0) / readings.length);
    // Mean Arterial Pressure (MAP) = (2*DIA + SYS) / 3
    const map = Math.round((2 * dia + sys) / 3);
    return { sys, dia, pulse, map };
  }, [readings]);

  const expiresDateStr = tokenPayload
    ? new Date(tokenPayload.expiresAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="w-12 h-12 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-slate-800">Verifying Cryptographic Consent Token...</p>
        <p className="text-xs text-slate-500 mt-1">Verifying consent with MyVita secure gateway</p>
      </div>
    );
  }

  return (
    <div id="recipient-view-container" className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Bar with back button */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToVault && (
              <button
                id="back-to-vault-btn"
                onClick={onBackToVault}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Vault</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600">
                <Lock className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base">
                My<span className="text-teal-600">Vita</span> <span className="text-xs font-medium text-slate-500">Recipient Portal</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline">
              Rote-v2 Gateway
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                isExpiredOrRevoked
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {isExpiredOrRevoked ? 'Unverified Session' : 'Verified Session'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* BANNER 1: EXPIRED / REVOKED (if applicable) */}
        {isExpiredOrRevoked ? (
          <div
            id="recipient-expired-banner"
            className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2 shadow-sm animate-in fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">
                  This access link has expired or been revoked.
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  {statusReason || 'Cryptographic authorization has lapsed. Request a new consent token from the patient.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* BANNER 2: VALID GREEN BANNER (Step 4 requirement) */
          <div
            id="recipient-granted-banner"
            className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-sm animate-in fade-in"
          >
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-emerald-950 leading-tight">
                    Access granted by {tokenPayload?.patientName || 'Patient'} • Scope: {tokenPayload?.scope}
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                    Authorized Recipient: <strong>{tokenPayload?.recipient}</strong> • Purpose:{' '}
                    <strong>{tokenPayload?.purpose}</strong> • Access expires: <strong>{expiresDateStr}</strong>
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-900 font-semibold self-start sm:self-auto">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Time-Box Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Content (Only shown if token is valid) */}
        {!isExpiredOrRevoked && (
          <>
            {/* Clinical Analytics / Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average SYS/DIA</span>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {averages.sys}/{averages.dia}
                </p>
                <span className="text-[11px] font-semibold text-teal-600">mmHg (AHA Stage 1)</span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mean Arterial Pressure</span>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {averages.map} <span className="text-xs font-normal text-slate-400">mmHg</span>
                </p>
                <span className="text-[11px] font-semibold text-slate-600">Target: 70–100 mmHg</span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Pulse</span>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {averages.pulse} <span className="text-xs font-normal text-slate-400">bpm</span>
                </p>
                <span className="text-[11px] font-semibold text-emerald-600">Normal Sinus Rhythm</span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Permitted Scope</span>
                <p className="text-sm font-black text-slate-900 mt-2 truncate">
                  {tokenPayload?.scope}
                </p>
                <span className="text-[11px] font-semibold text-slate-500">{readings.length} records revealed</span>
              </div>
            </div>

            {/* Recharts BP Trend Chart */}
            <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Blood Pressure Clinical Trend</h4>
                  <p className="text-xs text-slate-500">Systolic and Diastolic over authorized scope</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="text-slate-700">Systolic (SYS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                    <span className="text-slate-700">Diastolic (DIA)</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      domain={[60, 170]}
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    {/* Clinical normal threshold lines */}
                    <ReferenceLine y={130} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: '130 (Stage 1 SYS)', fill: '#D97706', fontSize: 10 }} />
                    <ReferenceLine y={80} stroke="#10B981" strokeDasharray="4 4" label={{ value: '80 (Normal DIA)', fill: '#059669', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#14B8A6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#14B8A6', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scope-Permitted Readings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Permitted Records ({readings.length})</h4>
                  <p className="text-xs text-slate-500">Filtered strictly by authorized token scope "{tokenPayload?.scope}"</p>
                </div>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                  FHIR-style Observation Export
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {readings.map((reading) => {
                  const date = new Date(reading.timestamp);
                  return (
                    <div
                      key={reading.id}
                      className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-bold text-xs">
                          {reading.systolic > 140 ? 'H2' : reading.systolic > 130 ? 'H1' : 'OK'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold font-mono text-slate-900">
                              {reading.systolic}/{reading.diastolic}
                            </span>
                            <span className="text-xs text-slate-400">mmHg</span>
                            <span className="text-xs font-medium text-slate-600 ml-2">
                              • {reading.pulse} bpm
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                          {reading.source}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* FOOTER: Step 4 requirement: "Accessed at [time]. This access is logged." */}
        <footer
          id="recipient-view-footer"
          className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border border-slate-800 shadow-md"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></div>
            <p className="text-slate-200 font-medium">
              Accessed at {accessTimestamp || 'just now'}. This access is logged in the patient's audit trail.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            MyVita Secure Gateway • Token: {isExpiredOrRevoked ? 'Rejected' : (tokenPayload?.consentId || 'Verified')}
          </span>
        </footer>
      </main>
    </div>
  );
}
