import { useState, useEffect, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertOctagon,
  Shield,
  Phone,
  Pill,
  Droplet,
  UserCheck,
  Check,
  Eye,
  Lock,
  Smartphone,
  Copy,
  AlertTriangle,
  HeartPulse,
} from 'lucide-react';
import { EmergencyProfile } from '../types';
import { getEmergencyProfile, saveEmergencyProfile, addAuditEvent } from '../lib/db';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export function EmergencyTab() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showParamedicModal, setShowParamedicModal] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getEmergencyProfile();
      setProfile(data);
      setIsLoading(false);
    }
    load();
  }, [currentUser.id]);

  const handleToggleEnabled = async () => {
    if (!profile) return;
    const updated = { ...profile, enabled: !profile.enabled, lastUpdated: Date.now() };
    setProfile(updated);
    await saveEmergencyProfile(updated);
    showToast(
      updated.enabled ? 'Emergency Access Activated' : 'Emergency Access Disabled',
      updated.enabled ? 'success' : 'warning',
      updated.enabled ? 'Lock-screen QR is active for first responders' : 'QR code invalidated'
    );
  };

  const handleUpdateField = (field: keyof EmergencyProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = { ...profile, lastUpdated: Date.now() };
      await saveEmergencyProfile(updated);
      showToast('Emergency profile saved', 'success', 'Updated fixed-payload lock-screen dataset');
    } catch {
      showToast('Error saving profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Fixed emergency payload format for first responders
  const emergencyPayloadJson = profile
    ? JSON.stringify({
        type: 'MYVITA_EMERGENCY_V1',
        patient: currentUser.name || 'Personal Vault Patient',
        bloodType: profile.bloodType || 'Not specified',
        allergies: profile.allergies || 'None reported',
        medications: profile.medications || 'None reported',
        emergencyContact: profile.contactName
          ? `${profile.contactName} (${profile.contactPhone || 'No phone'})`
          : 'None configured',
        routing: 'rote://myvita.health/emergency',
      })
    : '';

  const handleSimulateParamedicScan = async () => {
    setShowParamedicModal(true);
    // Log emergency access in audit trail!
    try {
      await addAuditEvent({
        type: 'EMERGENCY_ACCESSED',
        consentId: 'emergency_lockscreen_qr',
        recipient: 'Emergency Paramedics (EMS / Triage)',
        scope: 'Emergency Profile (Blood, Allergies, Meds, Contact)',
        details: `Lock-screen emergency QR accessed at ${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}. Location: Emergency Responder GPS.`,
      });
      showToast('Emergency QR Accessed', 'warning', 'Paramedic view opened & logged in audit trail');
    } catch {
      // ignore
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs">Loading emergency vault profile...</p>
      </div>
    );
  }

  return (
    <div id="emergency-tab-container" className="space-y-6">
      {/* Header with Tagline specified in prompt: "Seconds matter. So does privacy." */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Emergency Access Profile</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800">
              Paramedic Mode
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700 italic">
            "Seconds matter. So does privacy."
          </p>
          <p className="text-xs text-slate-500 max-w-xl">
            A fixed-payload lock-screen QR for paramedics. Only 5 critical triage fields are ever exposed.
            Your routine BP history remains completely locked and private.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-700">
            {profile.enabled ? 'Emergency Active' : 'Access Disabled'}
          </span>
          <button
            id="toggle-emergency-access-btn"
            type="button"
            onClick={handleToggleEnabled}
            className={`w-13 h-7 rounded-full p-1 transition-colors ${
              profile.enabled ? 'bg-rose-500' : 'bg-slate-300'
            }`}
            aria-label="Toggle Emergency Access"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                profile.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form with sample pre-filled data */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">5 Essential Triage Fields</h3>
            <span className="text-[11px] text-slate-500">Fixed Schema • No Deep History</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Blood Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-rose-500" />
                  Blood Type
                </label>
                <input
                  id="emergency-blood-type-input"
                  type="text"
                  value={profile.bloodType}
                  onChange={(e) => handleUpdateField('bloodType', e.target.value)}
                  placeholder="e.g. O+"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
                  Allergies
                </label>
                <input
                  id="emergency-allergies-input"
                  type="text"
                  value={profile.allergies}
                  onChange={(e) => handleUpdateField('allergies', e.target.value)}
                  placeholder="e.g. Penicillin"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-teal-600" />
                Active Medications
              </label>
              <input
                id="emergency-medications-input"
                type="text"
                value={profile.medications}
                onChange={(e) => handleUpdateField('medications', e.target.value)}
                placeholder="e.g. Amlodipine 5mg"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Emergency Contact Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Emergency Contact Name
                </label>
                <input
                  id="emergency-contact-name-input"
                  type="text"
                  value={profile.contactName}
                  onChange={(e) => handleUpdateField('contactName', e.target.value)}
                  placeholder="e.g. Priya (daughter)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Contact Phone Number
                </label>
                <input
                  id="emergency-contact-phone-input"
                  type="text"
                  value={profile.contactPhone}
                  onChange={(e) => handleUpdateField('contactPhone', e.target.value)}
                  placeholder="e.g. +91-9876543210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-medium text-slate-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                id="save-emergency-profile-btn"
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-teal-400" />
                {isSaving ? 'Saving...' : 'Update Emergency Card'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Lock-screen QR preview with fixed payload (Step 6 of demo path) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Lock-Screen Paramedic QR
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  profile.enabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {profile.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>

            {/* QR Card */}
            <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center text-slate-900 shadow-inner">
              {profile.enabled ? (
                <>
                  <div className="p-2 bg-white rounded-lg">
                    <QRCodeSVG value={emergencyPayloadJson} size={160} level="M" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 mt-2">
                    Fixed Paramedic Payload (Offline)
                  </p>
                  <p className="text-[10px] text-slate-500">Scannable by any camera or triage scanner</p>
                </>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <Lock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Emergency Access Disabled</p>
                  <p className="text-[10px] text-slate-400">Toggle switch above to activate QR</p>
                </div>
              )}
            </div>

            {/* Paramedic Preview Trigger */}
            <button
              id="simulate-paramedic-scan-btn"
              onClick={handleSimulateParamedicScan}
              disabled={!profile.enabled}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                profile.enabled
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview What Paramedic Sees</span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Privacy Guarantee:</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Paramedics only receive your Blood Type, Allergies, Meds, and Emergency Contact. They do not get
              access to your historical blood pressure records or doctor consultation notes.
            </p>
          </div>
        </div>
      </div>

      {/* Paramedic Scanned View Modal (Step 6 verification) */}
      {showParamedicModal && (
        <div
          id="paramedic-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
        >
          <div
            id="paramedic-modal-card"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-rose-400 overflow-hidden"
          >
            <div className="bg-rose-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div>
                  <h4 className="text-sm font-black tracking-tight uppercase">FIRST RESPONDER TRIAGE CARD</h4>
                  <p className="text-[11px] text-rose-100">Scanned via Lock-Screen Emergency QR</p>
                </div>
              </div>
              <button
                id="close-paramedic-modal-btn"
                onClick={() => setShowParamedicModal(false)}
                className="text-rose-100 hover:text-white text-xs font-bold px-2 py-1 bg-rose-700 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 bg-slate-50">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-semibold">PATIENT IDENTITY</span>
                  <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5 text-rose-500" /> BLOOD GROUP
                  </span>
                  <span className="text-base font-black text-rose-600 font-mono">
                    {profile.bloodType || 'Not specified'}
                  </span>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mb-1">
                    <AlertOctagon className="w-3.5 h-3.5 text-amber-500" /> KNOWN ALLERGIES
                  </span>
                  <p className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                    {profile.allergies || 'None Reported'}
                  </p>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mb-1">
                    <Pill className="w-3.5 h-3.5 text-teal-600" /> ACTIVE MEDICATIONS
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {profile.medications || 'None Reported'}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> EMERGENCY CONTACT
                  </span>
                  {profile.contactName || profile.contactPhone ? (
                    <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <div>
                        <p className="text-xs font-bold text-emerald-950">{profile.contactName || 'Primary Contact'}</p>
                        <p className="text-xs font-mono text-emerald-800">{profile.contactPhone || 'No phone set'}</p>
                      </div>
                      {profile.contactPhone && (
                        <a
                          href={`tel:${profile.contactPhone}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700"
                        >
                          Call Now
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                      No emergency contact configured yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-slate-300 rounded-xl text-[11px] flex items-center justify-between">
                <span>Access logged in patient audit ledger</span>
                <span className="text-teal-400 font-mono">Modiqo.ai (Rote)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
