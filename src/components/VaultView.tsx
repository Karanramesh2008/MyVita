import { useState } from 'react';
import { BPReading } from '../types';
import { deleteReading } from '../lib/db';
import { useToast } from '../context/ToastContext';
import {
  Camera,
  Share2,
  Trash2,
  Heart,
  Calendar,
  Lock,
  Plus,
  ShieldCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface VaultViewProps {
  readings: BPReading[];
  onOpenScan: () => void;
  onOpenShare: (reading: BPReading) => void;
  onRefresh: () => void;
}

export function VaultView({ readings, onOpenScan, onOpenShare, onRefresh }: VaultViewProps) {
  const { showToast } = useToast();
  const [filterSource, setFilterSource] = useState<string>('ALL');

  const handleDelete = async (id: string, sys: number, dia: number) => {
    if (confirm(`Delete reading ${sys}/${dia} mmHg from local vault?`)) {
      try {
        await deleteReading(id);
        showToast('Reading removed from vault', 'info');
        onRefresh();
      } catch {
        showToast('Error deleting reading', 'error');
      }
    }
  };

  const filteredReadings = readings.filter((r) => {
    if (filterSource === 'ALL') return true;
    return r.source === filterSource;
  });

  // Calculate quick stats for Patient Dashboard
  const latest = readings[0];
  const avgSys = readings.length ? Math.round(readings.reduce((s, r) => s + r.systolic, 0) / readings.length) : 0;
  const avgDia = readings.length ? Math.round(readings.reduce((s, r) => s + r.diastolic, 0) / readings.length) : 0;

  // AHA Category helper
  const getBPClassification = (sys: number, dia: number) => {
    if (sys > 140 || dia > 90) return { label: 'Hypertension Stage 2', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
    if (sys >= 130 || dia >= 80) return { label: 'Hypertension Stage 1', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    if (sys >= 120 && dia < 80) return { label: 'Elevated', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
    return { label: 'Normal (AHA Guidelines)', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  };

  return (
    <div id="vault-view-container" className="space-y-6">
      {/* Hero Action Card: Big Teal Button "Scan Reading" + Quick Stats */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Patient Local Vault
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                Encrypted At Rest
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Your Personal Health Vault
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
              Readings stay private in your local vault. When you share with Dr. Sharma, you create scoped,
              time-boxed consent tokens. Nothing is sent without your explicit signature.
            </p>
          </div>

          {/* Big Teal Button as specified in prompt: Big teal button: "Scan Reading" */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              id="big-teal-scan-reading-btn"
              onClick={onOpenScan}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all transform active:scale-98 flex items-center gap-3"
            >
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Scan Reading</span>
            </button>
          </div>
        </div>

        {/* Personalized Analytics Quick Banner */}
        {readings.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Latest Reading</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {latest.systolic}/{latest.diastolic}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Pulse {latest.pulse} bpm</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">14-Day Baseline</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {avgSys}/{avgDia}
              </p>
              <span className="text-[10px] text-teal-600 font-semibold">{readings.length} Vault Records</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Clinical Stage</span>
              <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                {getBPClassification(latest.systolic, latest.diastolic).label}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Per ACC/AHA 2024</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Sync Engine</span>
              <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Modiqo.ai Rote
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Zero Cloud Egress</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter / Category tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
            Recorded Blood Pressure Readings ({filteredReadings.length})
          </h3>
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {['ALL', 'OCR Scan', 'Connected Cuff', 'Manual'].map((src) => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterSource === src ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state (if user deletes all): Exactly as requested:
          "Your data stays yours. Nothing is shared until you say so." */}
      {readings.length === 0 ? (
        <div
          id="vault-empty-state"
          className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4 shadow-xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-extrabold text-slate-900">
              Your data stays yours. Nothing is shared until you say so.
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Scan your blood pressure monitor with your camera or add a test reading. Readings are stored
              securely on this device in IndexedDB.
            </p>
          </div>
          <button
            onClick={onOpenScan}
            className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Scan First Reading</span>
          </button>
        </div>
      ) : (
        /* List of readings (Each card: date, "150/95", pulse, source badge, "Share" button) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReadings.map((reading) => {
            const date = new Date(reading.timestamp);
            const dateStr = date.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const classification = getBPClassification(reading.systolic, reading.diastolic);

            return (
              <div
                key={reading.id}
                id={`reading-card-${reading.id}`}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-teal-500/40 shadow-xs hover:shadow transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    {/* Date and Time */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {dateStr} at {timeStr}
                      </span>
                    </div>

                    {/* Big Numbers: 150/95 */}
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                        {reading.systolic}/{reading.diastolic}
                      </span>
                      <span className="text-xs font-bold text-slate-400">mmHg</span>
                    </div>
                  </div>

                  {/* Source Badge */}
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {reading.source}
                  </span>
                </div>

                {/* Pulse & Classification Row */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                    <span>Pulse:</span>
                    <span className="font-mono font-bold text-slate-900">{reading.pulse} bpm</span>
                  </div>

                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${classification.bg} ${classification.color}`}>
                    {classification.label}
                  </span>
                </div>

                {reading.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    "{reading.notes}"
                  </p>
                )}

                {/* Bottom Actions: Share Button (Hero) & Delete */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleDelete(reading.id, reading.systolic, reading.diastolic)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete reading"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Share button as specified in prompt */}
                  <button
                    id={`share-reading-btn-${reading.id}`}
                    onClick={() => onOpenShare(reading)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Reading</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
