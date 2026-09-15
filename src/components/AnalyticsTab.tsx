import { useMemo, useState } from 'react';
import { BPReading, ConsentRecord } from '../types';
import { getHealthInsight } from '../lib/ai';
import {
  Activity,
  Heart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Lock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface AnalyticsTabProps {
  readings: BPReading[];
  consents: ConsentRecord[];
}

export function AnalyticsTab({ readings, consents }: AnalyticsTabProps) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiDisclaimer, setAiDisclaimer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const stagesData = useMemo(() => {
    let normal = 0;
    let elevated = 0;
    let stage1 = 0;
    let stage2 = 0;

    readings.forEach((r) => {
      if (r.systolic > 140 || r.diastolic > 90) stage2++;
      else if (r.systolic >= 130 || r.diastolic >= 80) stage1++;
      else if (r.systolic >= 120 && r.diastolic < 80) elevated++;
      else normal++;
    });

    return [
      { name: 'Normal (<120/80)', count: normal, color: '#10B981' },
      { name: 'Elevated (120-129)', count: elevated, color: '#F59E0B' },
      { name: 'Stage 1 (130-139)', count: stage1, color: '#F97316' },
      { name: 'Stage 2 (≥140/90)', count: stage2, color: '#EF4444' },
    ];
  }, [readings]);

  const privacyMetrics = useMemo(() => {
    const totalReadings = readings.length;
    const activeConsents = consents.filter((c) => !c.revoked && Date.now() < c.expiresAt);
    const sharedCount = activeConsents.reduce((acc, c) => acc + c.readingIds.length, 0);
    const privacyRatio = totalReadings > 0 ? Math.max(0, 100 - Math.min(100, Math.round((sharedCount / totalReadings) * 100))) : 100;

    return {
      totalReadings,
      activeConsents: activeConsents.length,
      privacyRatio,
    };
  }, [readings, consents]);

  const bpMetrics = useMemo(() => {
    if (readings.length === 0) {
      return { hasData: false, sysRange: '—', diaRange: '—', medianSys: '—', avgPulse: '—' };
    }
    const sysList = readings.map((r) => r.systolic).sort((a, b) => a - b);
    const diaList = readings.map((r) => r.diastolic).sort((a, b) => a - b);
    const minSys = sysList[0];
    const maxSys = sysList[sysList.length - 1];
    const minDia = diaList[0];
    const maxDia = diaList[diaList.length - 1];
    const medianSys = sysList[Math.floor(sysList.length / 2)];
    const avgPulse = Math.round(readings.reduce((sum, r) => sum + r.pulse, 0) / readings.length);

    return {
      hasData: true,
      sysRange: `${minSys} – ${maxSys}`,
      diaRange: `${minDia} – ${maxDia}`,
      medianSys: `${medianSys}`,
      avgPulse: `${avgPulse}`,
    };
  }, [readings]);

  const handleGenerateInsight = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const result = await getHealthInsight(readings);
      setAiInsight(result.insight);
      setAiDisclaimer(result.disclaimer);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Unable to generate an AI insight.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div id="analytics-tab-container" className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Personalized Health & Privacy Analytics</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800">AI Assisted</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Review your BP trends and optionally ask MyVita AI for a concise, non-diagnostic health insight.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Consent-based AI analysis</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 via-white to-teal-50 p-5 sm:p-6 rounded-2xl border border-indigo-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">MyVita AI Health Insight</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                AI reviews up to your 20 most recent BP readings to explain patterns in simple language. It does not diagnose or prescribe treatment.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateInsight}
            disabled={isAiLoading || readings.length === 0}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {isAiLoading ? 'Analyzing...' : 'Generate AI Insight'}
          </button>
        </div>

        {readings.length === 0 && (
          <p className="mt-4 text-xs text-slate-500 bg-white/70 rounded-xl p-3 border border-slate-200">Add a BP reading before generating an insight.</p>
        )}

        {aiError && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div><strong>AI unavailable:</strong> {aiError}</div>
          </div>
        )}

        {aiInsight && !aiError && (
          <div className="mt-4 bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Your insight</span>
            </div>
            <p className="text-sm leading-6 text-slate-700 whitespace-pre-line">{aiInsight}</p>
            {aiDisclaimer && <p className="mt-3 pt-3 border-t border-slate-100 text-[10px] leading-4 text-slate-400">{aiDisclaimer}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vault Privacy Quotient</span>
          <p className="text-3xl font-black text-teal-600 font-mono">{privacyMetrics.privacyRatio}% Private</p>
          <p className="text-xs text-slate-500">{privacyMetrics.activeConsents} active doctor/paramedic grants</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Historical Systolic Range</span>
          <p className="text-3xl font-black text-slate-900 font-mono">
            {bpMetrics.hasData ? <>{bpMetrics.sysRange} <span className="text-xs font-normal text-slate-400">mmHg</span></> : <span className="text-2xl text-slate-400">—</span>}
          </p>
          <p className="text-xs text-slate-500">{bpMetrics.hasData ? `Median Systolic: ${bpMetrics.medianSys} mmHg` : 'No readings in vault yet'}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mean Diastolic Range</span>
          <p className="text-3xl font-black text-slate-900 font-mono">
            {bpMetrics.hasData ? <>{bpMetrics.diaRange} <span className="text-xs font-normal text-slate-400">mmHg</span></> : <span className="text-2xl text-slate-400">—</span>}
          </p>
          <p className="text-xs text-emerald-600 font-semibold">{bpMetrics.hasData ? `Pulse average: ${bpMetrics.avgPulse} bpm` : 'Awaiting first reading'}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">ACC/AHA Blood Pressure Stages Distribution</h3>
            <p className="text-xs text-slate-500">Categorization of your {readings.length} stored records</p>
          </div>
        </div>

        {readings.length === 0 ? (
          <div className="h-48 w-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center p-6">
            <Activity className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No Blood Pressure Records in Vault</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">Scan a blood pressure monitor reading or add manual entries in the Vault tab to see on-device clinical analytics.</p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stagesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {stagesData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
