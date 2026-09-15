import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Share2,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Clock,
  User,
  Activity,
  FileCheck,
  Copy,
  ExternalLink,
  Ban,
  Lock,
  Sparkles
} from 'lucide-react';
import { BPReading, ConsentRecipient, ConsentScope, ConsentPurpose, ConsentDuration, ConsentRecord } from '../types';
import { generateConsentToken } from '../lib/token';
import { saveConsent, revokeConsent } from '../lib/db';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetReading?: BPReading | null;
  allReadings: BPReading[];
  onConsentCreated: (consent: ConsentRecord) => void;
  onSimulateOpenRecipient: (token: string) => void;
}

const RECIPIENT_OPTIONS: { id: ConsentRecipient; label: string; desc: string; icon: string }[] = [
  { id: 'Dr. Sharma', label: 'Dr. Sharma', desc: 'Cardiologist • St. Jude Medical', icon: '🩺' },
  { id: 'Mom', label: 'Mom', desc: 'Family Member • Personal Circle', icon: '❤️' },
  { id: 'Insurance', label: 'Insurance', desc: 'Aetna Health Plan Claim Audit', icon: '📄' },
  { id: 'Custom', label: 'Custom Specialist', desc: 'Enter custom physician or clinic name', icon: '🏥' },
];

const SCOPE_OPTIONS: { id: ConsentScope; label: string; desc: string; badge: string }[] = [
  {
    id: 'This reading',
    label: 'This Reading Only',
    desc: 'Only the single selected BP measurement is exposed',
    badge: '1 Record',
  },
  {
    id: 'Last 30 days',
    label: 'Last 30 Days Trend',
    desc: 'Readings recorded within the past 30 calendar days',
    badge: '30-Day Window',
  },
  {
    id: 'All BP',
    label: 'All BP Records',
    desc: 'Entire historical blood pressure timeline and stats',
    badge: 'Full History',
  },
  {
    id: 'Summary only',
    label: 'Summary & Averages Only',
    desc: 'Mean arterial pressure and average range, raw points hidden',
    badge: 'High Privacy',
  },
];

const PURPOSE_OPTIONS: { id: ConsentPurpose; label: string; desc: string }[] = [
  { id: 'Consultation', label: 'Consultation', desc: 'Direct doctor appointment, treatment review & prescription' },
  { id: 'Monitoring', label: 'Monitoring', desc: 'Remote patient surveillance and steady-state tracking' },
  { id: 'Insurance', label: 'Insurance Claim', desc: 'Underwriting verification and reimbursement validation' },
  { id: 'Emergency', label: 'Emergency', desc: 'Urgent acute triage care and paramedic assessment' },
];

const DURATION_OPTIONS: { id: ConsentDuration; label: string; hours: number; tag: string }[] = [
  { id: '1 hour', label: '1 Hour', hours: 1, tag: 'Flash Check' },
  { id: '24 hours', label: '24 Hours', hours: 24, tag: 'Same-Day' },
  { id: '7 days', label: '7 Days', hours: 168, tag: 'Standard Demo' },
  { id: '30 days', label: '30 Days', hours: 720, tag: 'Clinical Cycle' },
];

export function ConsentModal({
  isOpen,
  onClose,
  targetReading,
  allReadings,
  onConsentCreated,
  onSimulateOpenRecipient,
}: ConsentModalProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Wizard Step: 1 (Recipient) -> 2 (Scope) -> 3 (Purpose) -> 4 (Duration) -> 5 (Generated QR & Link)
  const [step, setStep] = useState<number>(1);

  // Form selections (Default set to match the 3-minute demo path):
  // "creates consent: 'Dr. Sharma, BP only, 7 days, consultation' -> QR code appears"
  const [recipient, setRecipient] = useState<ConsentRecipient>('Dr. Sharma');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [scope, setScope] = useState<ConsentScope>('All BP');
  const [purpose, setPurpose] = useState<ConsentPurpose>('Consultation');
  const [duration, setDuration] = useState<ConsentDuration>('7 days');

  // Generated state
  const [generatedConsent, setGeneratedConsent] = useState<ConsentRecord | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Generate Consent
      handleSubmitConsent();
    }
  };

  const handlePrev = () => {
    if (step > 1 && step <= 4) {
      setStep(step - 1);
    }
  };

  const handleSubmitConsent = async () => {
    const finalRecipient = recipient === 'Custom' ? customRecipientName.trim() || 'Custom Specialist' : recipient;
    const durHours = DURATION_OPTIONS.find((d) => d.id === duration)?.hours || 168;
    const expiresAt = Date.now() + durHours * 3600 * 1000;
    const consentId = 'cst_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    // Determine allowed reading IDs
    let readingIds: string[] = [];
    if (scope === 'This reading' && targetReading) {
      readingIds = [targetReading.id];
    } else if (scope === 'Last 30 days') {
      const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
      readingIds = allReadings.filter((r) => r.timestamp >= cutoff).map((r) => r.id);
    } else {
      readingIds = allReadings.map((r) => r.id);
    }

    // Filter permitted readings data to bundle in token
    const permittedReadings = allReadings.filter((r) => readingIds.includes(r.id));

    // Generate JWT-style token
    const token = generateConsentToken({
      consentId,
      patientName: currentUser.name || 'Personal Vault Patient',
      recipient: finalRecipient,
      scope,
      purpose,
      readingIds,
      expiresAt,
      readingsData: permittedReadings,
      patientId: currentUser.id,
    });

    const newConsent: ConsentRecord = {
      id: consentId,
      readingIds,
      recipient: finalRecipient,
      scope,
      purpose,
      expiresAt,
      revoked: false,
      token,
      createdAt: Date.now(),
      patientName: currentUser.name || 'Personal Vault Patient',
    };

    try {
      await saveConsent(newConsent);
      setGeneratedConsent(newConsent);
      setIsRevoked(false);
      setStep(5); // Show QR Result Screen
      onConsentCreated(newConsent);
      showToast(
        `Consent created for ${finalRecipient}`,
        'success',
        `Scoped token valid for ${duration} • Real-time audit logged`
      );
    } catch (err) {
      showToast('Failed to save consent', 'error');
    }
  };

  const handleRevoke = async () => {
    if (!generatedConsent) return;
    try {
      await revokeConsent(generatedConsent.id);
      setIsRevoked(true);
      showToast('Consent revoked immediately', 'warning', 'Recipient links invalidated via Modiqo Rote');
    } catch (err) {
      showToast('Error revoking consent', 'error');
    }
  };

  const getRecipientUrl = () => {
    if (!generatedConsent) return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}#/view/${encodeURIComponent(generatedConsent.token)}`;
  };

  const handleCopyLink = async () => {
    const url = getRecipientUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied to clipboard', 'info');
    } catch {
      showToast('Link ready', 'info', url);
    }
  };

  const effectiveRecipient = recipient === 'Custom' ? customRecipientName || 'Custom' : recipient;

  return (
    <div
      id="consent-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="consent-modal-container"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {step === 5 ? 'Active Consent Token' : 'Create Time-Boxed Consent'}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 5 ? 'Cryptographic Token Generated' : `Step ${step} of 4: The Hero Consent Layer`}
              </p>
            </div>
          </div>
          <button
            id="consent-modal-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar (steps 1-4) */}
        {step <= 4 && (
          <div className="bg-slate-100 px-6 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1 font-semibold text-slate-700">
              <span>Step {step}:</span>
              <span className="text-teal-600">
                {step === 1 && 'Recipient'}
                {step === 2 && 'Data Scope'}
                {step === 3 && 'Access Purpose'}
                {step === 4 && 'Time Box'}
              </span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step
                      ? 'w-6 bg-teal-500'
                      : s < step
                      ? 'w-3 bg-teal-300'
                      : 'w-3 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="p-6">
          {/* STEP 1: RECIPIENT */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Who is receiving this data?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Only this verified recipient identity will be authorized to decode the payload.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {RECIPIENT_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    id={`recipient-option-${opt.id}`}
                    onClick={() => setRecipient(opt.id)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      recipient === opt.id
                        ? 'border-teal-500 bg-teal-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </div>
                    {recipient === opt.id && <Check className="w-5 h-5 text-teal-600 shrink-0" />}
                  </div>
                ))}
              </div>

              {recipient === 'Custom' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specialist / Clinic Name
                  </label>
                  <input
                    type="text"
                    value={customRecipientName}
                    onChange={(e) => setCustomRecipientName(e.target.value)}
                    placeholder="e.g. Dr. Jennifer Adams, Nephrologist"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SCOPE */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Define Scope Boundary</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  The recipient’s client decrypts and views ONLY the data within this boundary.
                </p>
              </div>

              {targetReading && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Selected Reading:</span>
                  <span className="font-mono font-bold text-teal-700">
                    {targetReading.systolic}/{targetReading.diastolic} mmHg (Pulse: {targetReading.pulse})
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5">
                {SCOPE_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    id={`scope-option-${opt.id}`}
                    onClick={() => setScope(opt.id)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      scope === opt.id
                        ? 'border-teal-500 bg-teal-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="pr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                    {scope === opt.id && <Check className="w-5 h-5 text-teal-600 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PURPOSE */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Declared Medical Purpose</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ties the consent token to a specific clinical intent for regulatory auditability.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {PURPOSE_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    id={`purpose-option-${opt.id}`}
                    onClick={() => setPurpose(opt.id)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      purpose === opt.id
                        ? 'border-teal-500 bg-teal-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                    {purpose === opt.id && <Check className="w-5 h-5 text-teal-600 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: DURATION */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Time-Boxed Lifespan</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  After expiration, the token is automatically rejected by the cryptographic validator.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    id={`duration-option-${opt.id}`}
                    onClick={() => setDuration(opt.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      duration === opt.id
                        ? 'border-teal-500 bg-teal-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-extrabold text-slate-900">{opt.label}</span>
                      {duration === opt.id && <Check className="w-4 h-4 text-teal-600" />}
                    </div>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded w-fit">
                      {opt.tag}
                    </span>
                  </div>
                ))}
              </div>

              {/* Consent Summary Pill Card */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                <div className="flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider text-[11px]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ready to Mint Scoped Consent</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-400">Recipient:</span> {effectiveRecipient}
                  </div>
                  <div>
                    <span className="text-slate-400">Scope:</span> {scope}
                  </div>
                  <div>
                    <span className="text-slate-400">Purpose:</span> {purpose}
                  </div>
                  <div>
                    <span className="text-slate-400">Expiry:</span> {duration}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: GENERATED QR & TOKEN DISPLAY (HERO SCREEN) */}
          {step === 5 && generatedConsent && (
            <div className="space-y-4">
              {isRevoked ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <Ban className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-rose-900">Consent Revoked</h4>
                  <p className="text-xs text-rose-700">
                    This token is no longer authorized. Access attempts will be denied.
                  </p>
                </div>
              ) : (
                <>
                  {/* Hero Scoped Parameters Banner */}
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-teal-600" />
                        Consent Minted • Dr. Sharma BP Demo
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-600 text-white">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-teal-800">
                      <strong>{generatedConsent.recipient}</strong> • Scope: {generatedConsent.scope} • Purpose:{' '}
                      {generatedConsent.purpose} • Expires in {duration}
                    </p>
                  </div>

                  {/* QR Code Container (Real phone scannable!) */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 flex flex-col items-center justify-center shadow-inner">
                    <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100">
                      <QRCodeSVG
                        value={getRecipientUrl()}
                        size={190}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-2 flex items-center gap-1">
                      <span>Point camera or open recipient view directly below</span>
                    </p>
                  </div>

                  {/* Action Buttons for Step 4 of the 3-minute demo path:
                      "Opens recipient view in new tab (simulated scan) → doctor sees ONLY the permitted BP trend" */}
                  <div className="space-y-2 pt-1">
                    <button
                      id="simulate-scan-open-recipient-btn"
                      onClick={() => onSimulateOpenRecipient(generatedConsent.token)}
                      className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md hover:shadow transition-all flex items-center justify-center gap-2"
                    >
                      <span>Simulate Recipient Scan (Open Doctor View)</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <div className="flex gap-2">
                      <button
                        id="copy-consent-link-btn"
                        onClick={handleCopyLink}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-50 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        Copy Link
                      </button>

                      <button
                        id="revoke-consent-btn"
                        onClick={handleRevoke}
                        className="py-2 px-4 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-500" />
                        Revoke Access
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step Navigation Bar */}
          {step <= 4 && (
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-5">
              {step > 1 ? (
                <button
                  id="consent-prev-step-btn"
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div></div>
              )}

              <button
                id="consent-next-step-btn"
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow transition-all flex items-center gap-2"
              >
                <span>{step === 4 ? 'Mint Consent QR' : 'Next Step'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="pt-3 text-center">
              <button
                id="consent-done-btn"
                onClick={onClose}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Return to Vault
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
